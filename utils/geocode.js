import axios from 'axios'
import { manualOverrides } from './manualOverrides.js'
import { distance as calcDistance } from './distance.js'
import { districtDistanceThresholds } from './districtDistanceThresholds.js'

const MAX_ATTEMPTS = 3
const REQUEST_INTERVAL_MS = 1000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isValidTaiwanLatLon = (lat, lon) => lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123

// 中文數字轉換（簡單且正確版）
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
    零: '0',
  }
  return str
    .replace(/([一二三四五六七八九])十([一二三四五六七八九])?/g, (m, t, u) => {
      const tens = map[t] || '0'
      const units = u ? map[u] : '0'
      return `${parseInt(tens) * 10 + parseInt(units)}`
    })
    .replace(/十([一二三四五六七八九])?/g, (m, u) => {
      const units = u ? map[u] : '0'
      return `${10 + parseInt(units)}`
    })
    .replace(/[一二三四五六七八九零]/g, (m) => map[m] || m)
}

// 產生多層地址查詢字串，從完整到簡化
function generateQueries(address) {
  if (!address) return []

  const converted = convertChineseNumbers(address)

  // 處理「之字門牌號」，把 13之2號 轉成 13號
  const normalizedAddress = converted.replace(/之\d+號/, '號')

  const queries = []
  queries.push(normalizedAddress) // 完整地址
  queries.push(normalizedAddress.replace(/\d+號.*/, '')) // 去除門牌號
  queries.push(normalizedAddress.replace(/\d+巷.*/, '')) // 去除巷號
  const noLane = normalizedAddress.replace(/\d+巷\d*之?\d*號?.*/, '') // 去巷號及門牌號
  if (noLane !== normalizedAddress) queries.push(noLane)

  // 鄉鎮市區層級
  const townshipMatch = normalizedAddress.match(/^(.*?(縣|市).+?(鄉|鎮|市區))/)
  if (townshipMatch) queries.push(townshipMatch[0])

  // 縣市層級
  const cityMatch = normalizedAddress.match(/^(.*?(縣|市))/)
  if (cityMatch) queries.push(cityMatch[0])

  // 過濾重複且長度大於5的
  return [...new Set(queries)].filter((q) => q.length > 5)
}

// 向 Nominatim 查詢
async function queryNominatim(query) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'tw', // 限制台灣
        },
        headers: {
          'User-Agent': `LineBot/1.0 ${process.env.CONTACT_EMAIL || 'no-email'}`,
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
      console.error(`[queryNominatim] 第${i + 1}次嘗試失敗，查詢: "${query}"，錯誤:`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

// 取得距離閾值
function getThreshold(city, district) {
  const cityThreshold = districtDistanceThresholds[city]
  if (!cityThreshold) return districtDistanceThresholds.default

  if (typeof cityThreshold === 'number') return cityThreshold

  if (typeof cityThreshold === 'object' && cityThreshold !== null) {
    if (cityThreshold[district]) return cityThreshold[district]
    if (Array.isArray(cityThreshold) && cityThreshold.includes(district)) return 4
    return cityThreshold.default || districtDistanceThresholds.default
  }
  return districtDistanceThresholds.default
}

/**
 * 主函式：地理編碼地址
 * @param {string} address
 * @param {object} cache 可選快取
 * @returns {Promise<{lat:number, lon:number} | null>}
 */
export async function geocodeAddress(address, cache = {}) {
  if (!address) {
    console.log('[geocodeAddress] 地址為空，跳過。')
    return null
  }

  if (cache[address]) {
    return cache[address]
  }

  const queries = generateQueries(address)
  console.log(`[geocodeAddress] 為 "${address}" 產生查詢字串：`, queries)

  for (const query of queries) {
    const result = await queryNominatim(query)

    if (result) {
      const { lat, lon, address: resAddr } = result
      const city = resAddr?.county || resAddr?.state || resAddr?.city || ''
      // 嘗試優先取 district，避免用村里層級誤判
      let district = ''
      if (resAddr?.city_district) district = resAddr.city_district
      else if (resAddr?.town) district = resAddr.town
      else if (resAddr?.village) district = resAddr.village
      else if (resAddr?.suburb) district = resAddr.suburb
      else if (resAddr?.hamlet) district = resAddr.hamlet

      // 嘗試用 township 名稱替代 district 避免誤判
      if (!manualOverrides?.[city]?.[district]) {
        if (district !== resAddr?.town && resAddr?.town) district = resAddr.town
        else if (district !== resAddr?.city_district && resAddr?.city_district)
          district = resAddr.city_district
      }

      const override = manualOverrides?.[city]?.[district]
      if (override) {
        const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
        const threshold = getThreshold(city, district)

        if (dist > threshold) {
          console.log(
            `[geocodeAddress] 誤差過大，使用手動中心點 (${city}${district})，距離: ${dist.toFixed(2)} 公里，閾值: ${threshold} 公里。`,
          )
          cache[address] = override
          return override
        } else {
          console.log(
            `[geocodeAddress] 定位誤差可接受，使用原始結果 (${city}${district})，距離: ${dist.toFixed(2)} 公里。`,
          )
          cache[address] = { lat, lon }
          return { lat, lon }
        }
      } else {
        console.log(`[geocodeAddress] 無手動中心點，使用原始結果 (${city}${district})。`)
        cache[address] = { lat, lon }
        return { lat, lon }
      }
    }

    await delay(REQUEST_INTERVAL_MS)
  }

  console.warn(`[geocodeAddress] 無法為地址 "${address}" 找到有效地理編碼結果。`)
  return null
}
