import axios from 'axios'
import { manualOverrides } from './manualOverrides.js'
import { distance as calcDistance } from './distance.js'

const MAX_ATTEMPTS = 3
const REQUEST_INTERVAL_MS = 1000
const DEFAULT_THRESHOLD_KM = 1.5

// 特殊地區允許較大定位誤差
const districtDistanceThresholds = {
  連江縣: 4,
  澎湖縣: 4,
  金門縣: 4,
  花蓮縣: 4,
  臺東縣: 4,
  南投縣: 3.5,
  屏東縣: ['牡丹鄉', '滿州鄉', '泰武鄉', '來義鄉', '霧臺鄉'],
  高雄市: ['桃源區', '那瑪夏區', '茂林區'],
  新北市: ['烏來區'],
  宜蘭縣: ['南澳鄉', '大同鄉'],
  新竹縣: ['五峰鄉', '尖石鄉'],
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isValidTaiwanLatLon = (lat, lon) => lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123

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
        const { lat, lon, address } = res.data[0]
        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        if (isValidTaiwanLatLon(latNum, lonNum)) {
          return { lat: latNum, lon: lonNum, address }
        }
      }
    } catch (e) {
      console.error(`[queryNominatim] 嘗試失敗 (第${i + 1}次):`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

// 自動決定容忍距離
function getThreshold(city, district) {
  const area = districtDistanceThresholds[city]
  if (!area) return DEFAULT_THRESHOLD_KM

  if (typeof area === 'number') return area
  if (Array.isArray(area) && area.includes(district)) return 4

  return DEFAULT_THRESHOLD_KM
}

export async function geocodeAddress(address) {
  if (!address) return null

  const queries = generateQueries(address)

  for (const query of queries) {
    const result = await queryNominatim(query)
    if (result) {
      const { lat, lon, address: resultAddress } = result

      const city = resultAddress?.county || resultAddress?.state || ''
      const district =
        resultAddress?.suburb || resultAddress?.city_district || resultAddress?.town || ''

      const override = manualOverrides?.[city]?.[district]

      if (override) {
        const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
        const threshold = getThreshold(city, district)

        if (dist > threshold) {
          console.log(
            `${city}${district} 定位誤差 ${dist.toFixed(2)} 公里，超過 ${threshold} 公里 → 套用手動修正`,
          )
          return override
        } else {
          console.log(
            `${city}${district} 定位誤差 ${dist.toFixed(2)} 公里，在 ${threshold} 公里內 → 維持原始座標`,
          )
          return { lat, lon }
        }
      }

      return { lat, lon }
    }

    await delay(REQUEST_INTERVAL_MS)
  }

  return null
}
