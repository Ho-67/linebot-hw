import axios from 'axios'
import { manualOverrides } from './manualOverrides.js'
import { distance as calcDistance } from './distance.js'
import { districtDistanceThresholds } from './districtDistanceThresholds.js'

const MAX_ATTEMPTS = 3
const REQUEST_INTERVAL_MS = 1000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 檢查經緯度是否在台灣合理範圍內
const isValidTaiwanLatLon = (lat, lon) => lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123

// 轉換中文數字，以便Nominatim更好地識別地址
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
    .replace(/([一二三四五六七八九]{1})十([一二三四五六七八九])?/g, (match, tens, units) => {
      const t = map[tens] || '0'
      const u = map[units] || '0'
      return `${parseInt(t) * 10 + (units ? parseInt(u) : 0)}`
    })
    .replace(/十([一二三四五六七八九])?/g, (match, unit) => {
      const u = map[unit] || '0'
      return `${10 + parseInt(u)}`
    })
    .replace(/[一二三四五六七八九]/g, (m) => map[m] || m)
    .replace(/零/g, '0')
}

// 產生多種查詢字串，提高地理編碼成功率（多層地址查詢，順序調整為由完整到簡化）
function generateQueries(address) {
  if (!address) return []

  const converted = convertChineseNumbers(address)

  // 處理「之字門牌號」，將 13之2號 轉成 13號
  const normalizedAddress = converted.replace(/之\d+號/, '號')

  const queries = []

  // 加入完整地址（已正規化）
  queries.push(normalizedAddress)

  // 移除門牌號碼，例如「42號」後面全部移除
  queries.push(normalizedAddress.replace(/\d+號.*/, ''))

  // 移除巷號
  queries.push(normalizedAddress.replace(/\d+巷.*/, ''))

  // 移除巷號與門牌號
  const noLane = normalizedAddress.replace(/\d+巷\d*之?\d*號?.*/, '')
  if (noLane !== normalizedAddress) queries.push(noLane)

  // 優先鄉鎮市區層級（township）
  const townshipMatch = normalizedAddress.match(/^(.*?(縣|市).+?(鄉|鎮|市區))/)
  if (townshipMatch) queries.push(townshipMatch[0])

  // 加入縣市層級
  const cityMatch = normalizedAddress.match(/^(.*?(縣|市))/)
  if (cityMatch) queries.push(cityMatch[0])

  // 過濾重複與過短查詢字串
  return [...new Set(queries)].filter((q) => q.length > 5)
}

// 向 Nominatim API 發送請求（嘗試多次與延遲，防止過載）
async function queryNominatim(query) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'tw',
        },
        headers: {
          'User-Agent': `LineBot/1.0 ${process.env.CONTACT_EMAIL}`,
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
      console.error(`[queryNominatim] 嘗試失敗 (第${i + 1}次), 查詢: "${query}" 錯誤:`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

// 取得距離閾值
function getThreshold(city, district) {
  const cityThreshold = districtDistanceThresholds[city]

  if (!cityThreshold) {
    return districtDistanceThresholds.default
  }

  if (typeof cityThreshold === 'number') {
    return cityThreshold
  }

  if (typeof cityThreshold === 'object' && cityThreshold !== null) {
    if (cityThreshold[district]) {
      return cityThreshold[district]
    }
    if (Array.isArray(cityThreshold) && cityThreshold.includes(district)) {
      return 4
    }
    return cityThreshold.default || districtDistanceThresholds.default
  }
  return districtDistanceThresholds.default
}

/**
 * 地理編碼主函式
 * @param {string} address
 * @param {object} [cache] - 可選：地址與結果快取，格式 { [address]: { lat, lon } }
 * @returns {Promise<{lat:number, lon:number} | null>}
 */
export async function geocodeAddress(address, cache = {}) {
  if (!address) {
    console.log('[geocodeAddress] 地址為空，跳過地理編碼。')
    return null
  }

  // 若有快取，優先回傳
  if (cache[address]) {
    // console.log(`[geocodeAddress] 從快取獲得 "${address}" 的座標`)
    return cache[address]
  }

  // 產生多層地址查詢字串（多層嘗試查詢）
  const queries = generateQueries(address)
  console.log(`[geocodeAddress] 嘗試為地址 "${address}" 進行地理編碼，生成查詢:`, queries)

  for (const query of queries) {
    const result = await queryNominatim(query)

    if (result) {
      const { lat, lon, address: resultAddress } = result

      // 多層行政區名稱判斷（優先 county, state, city）
      const city = resultAddress?.county || resultAddress?.state || resultAddress?.city || ''

      // 嘗試依優先順序取得 district，避免取到村里級別造成誤判
      let district = ''
      if (resultAddress?.city_district) district = resultAddress.city_district
      else if (resultAddress?.town) district = resultAddress.town
      else if (resultAddress?.village) district = resultAddress.village
      else if (resultAddress?.suburb) district = resultAddress.suburb
      else if (resultAddress?.hamlet) district = resultAddress.hamlet
      else district = ''

      const fallbackDistrict = district

      // 若找不到手動覆蓋，嘗試用鄉鎮或市區名稱替代（避免錯誤里村匹配）
      if (!manualOverrides?.[city]?.[district]) {
        if (district !== resultAddress?.town && resultAddress?.town) {
          district = resultAddress.town
        } else if (district !== resultAddress?.city_district && resultAddress?.city_district) {
          district = resultAddress.city_district
        }
      }

      // 取手動覆蓋的中心點
      const override = manualOverrides?.[city]?.[district]

      if (override) {
        const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
        const threshold = getThreshold(city, district)

        // 距離容忍度判斷，多層防呆，距離過大則使用手動中心點
        if (dist > threshold) {
          console.log(
            `[geocodeAddress] 定位誤差過大！"${city}${district}" 地址經緯度 (${lat.toFixed(
              6,
            )}, ${lon.toFixed(6)}) 距中心點 (${override.lat.toFixed(6)}, ${override.lon.toFixed(
              6,
            )}) 距離 ${dist.toFixed(2)} 公里，超過閾值 ${threshold} 公里。已使用中心點座標。`,
          )
          cache[address] = override
          return override
        } else {
          console.log(
            `[geocodeAddress] 定位誤差可接受，維持 Nominatim 原始結果 "${city}${district}" (${lat.toFixed(
              7,
            )}, ${lon.toFixed(7)})，距離: ${dist.toFixed(2)} km`,
          )
          cache[address] = { lat, lon }
          return { lat, lon }
        }
      } else {
        // 找不到手動中心點，直接使用 Nominatim 回傳結果
        console.log(
          `[geocodeAddress] 未找到 "${city}${district}" (嘗試前一層名稱 "${fallbackDistrict}") 的手動中心點數據，使用 Nominatim 原始結果 (${lat.toFixed(
            7,
          )}, ${lon.toFixed(7)})。`,
        )
        cache[address] = { lat, lon }
        return { lat, lon }
      }
    }

    await delay(REQUEST_INTERVAL_MS)
  }

  console.warn(`[geocodeAddress] 警告: 無法為地址 "${address}" 找到有效的地理編碼結果。`)
  return null
}
