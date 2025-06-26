import axios from 'axios'

const MAX_ATTEMPTS = 3
const REQUEST_INTERVAL_MS = 1000 // 1 秒

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isValidTaiwanLatLon = (lat, lon) => {
  return lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123
}

// 加入中文數字轉換
function convertChineseNumbers(str) {
  const map = {
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10',
  }
  return str
    .replace(/([一二三四五六七八九十]{1,3})十([一二三四五六七八九])?/g, (match, tens, units) => {
      const t = map[tens] || '0'
      const u = map[units] || '0'
      return `${parseInt(t) * 10 + parseInt(u)}`
    })
    .replace(/十([一二三四五六七八九])?/g, (match, unit) => {
      const u = map[unit] || '0'
      return `${10 + parseInt(u)}`
    })
    .replace(/[一二三四五六七八九十]/g, (m) => map[m] || m)
}

function generateQueries(address) {
  if (!address) return []

  // 對地址先做中文數字轉換
  const converted = convertChineseNumbers(address)
  const queries = []

  queries.push(converted)
  queries.push(converted.replace(/\d+號.*/, ''))
  queries.push(converted.replace(/\d+巷.*/, ''))
  const noLane = converted.replace(/\d+巷\d+號.*/, '')
  if (noLane !== converted) queries.push(noLane)

  const townshipMatch = converted.match(/^(.*?(縣|市).+?(鄉|鎮|市區))/)
  if (townshipMatch) queries.push(townshipMatch[0])

  const cityMatch = converted.match(/^(.*?(縣|市))/)
  if (cityMatch) queries.push(cityMatch[0])

  return [...new Set(queries)]
}

async function queryNominatim(query) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': `LineBot/1.0 (${process.env.CONTACT_EMAIL})`,
        },
      })
      if (res.data && res.data.length > 0) {
        const { lat, lon } = res.data[0]
        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        if (isValidTaiwanLatLon(latNum, lonNum)) {
          return { lat: latNum, lon: lonNum }
        }
      }
    } catch (e) {
      console.error(`[queryNominatim] 嘗試失敗 (第${i + 1}次):`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

export async function geocodeAddress(address) {
  if (!address) return null

  const queries = generateQueries(address)

  for (const query of queries) {
    const result = await queryNominatim(query)
    if (result) return result
    await delay(REQUEST_INTERVAL_MS)
  }

  return null
}
