import axios from 'axios'
import { manualOverrides } from './manualOverrides.js'
import { distance as calcDistance } from './distance.js'
import { districtDistanceThresholds } from './districtDistanceThresholds.js' // 導入新的閾值設定

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

  // 處理「X十X」和「十X」的形式，例如「二十三號」、「十五號」
  return str
    .replace(/([一二三四五六七八九]{1})十([一二三四五六七八九])?/g, (match, tens, units) => {
      const t = map[tens] || '0'
      const u = map[units] || '0'
      return `${parseInt(t) * 10 + (units ? parseInt(u) : 0)}` // 處理只有「二十」沒有「三」的情況
    })
    .replace(/十([一二三四五六七八九])?/g, (match, unit) => {
      const u = map[unit] || '0'
      return `${10 + parseInt(u)}`
    })
    .replace(/[一二三四五六七八九]/g, (m) => map[m] || m) // 處理單個中文數字
    .replace(/零/g, '0') // 處理零
}

// 產生多種查詢字串，提高地理編碼成功率
function generateQueries(address) {
  if (!address) return []

  const converted = convertChineseNumbers(address)
  const queries = []

  queries.push(converted) // 原始轉換後地址
  queries.push(converted.replace(/\d+號.*/, '')) // 移除門牌號碼
  queries.push(converted.replace(/\d+巷.*/, '')) // 移除巷號
  const noLane = converted.replace(/\d+巷\d+號.*/, '') // 移除巷號和門牌號碼
  if (noLane !== converted) queries.push(noLane)

  // 嘗試只用鄉鎮市區層級的地址
  const townshipMatch = converted.match(/^(.*?(縣|市).+?(鄉|鎮|市區))/)
  if (townshipMatch) queries.push(townshipMatch[0])

  // 嘗試只用縣市層級的地址
  const cityMatch = converted.match(/^(.*?(縣|市))/)
  if (cityMatch) queries.push(cityMatch[0])

  return [...new Set(queries)].filter((q) => q.length > 5) // 篩選掉過短的查詢，避免不精確結果
}

// 向 Nominatim API 發送請求
async function queryNominatim(query) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1, // 只取第一個結果
          addressdetails: 1, // 獲取詳細地址資訊
          countrycodes: 'tw', // 限定台灣
        },
        headers: {
          'User-Agent': `LineBot/1.0 ${process.env.CONTACT_EMAIL}`,
        },
      })

      if (res.data && res.data.length > 0) {
        const { lat, lon, address } = res.data[0]
        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        // 確認是否在台灣範圍內
        if (isValidTaiwanLatLon(latNum, lonNum)) {
          return { lat: latNum, lon: lonNum, address }
        }
      }
    } catch (e) {
      console.error(`[queryNominatim] 嘗試失敗 (第${i + 1}次), 查詢: "${query}" 錯誤:`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS) // 每次嘗試間隔
  }
  return null
}

// 獲取特定縣市或鄉鎮的距離閾值
function getThreshold(city, district) {
  const cityThreshold = districtDistanceThresholds[city]

  if (!cityThreshold) {
    return districtDistanceThresholds.default
  }

  if (typeof cityThreshold === 'number') {
    return cityThreshold
  }

  // 如果 cityThreshold 是物件，代表有細分鄉鎮閾值
  if (typeof cityThreshold === 'object' && cityThreshold !== null) {
    // 檢查是否有精確的鄉鎮閾值
    if (cityThreshold[district]) {
      return cityThreshold[district]
    }
    // 如果是陣列，檢查鄉鎮是否在特殊列表裡
    if (Array.isArray(cityThreshold) && cityThreshold.includes(district)) {
      return 4 // 這裡可以根據您的需求調整
    }
    return cityThreshold.default || districtDistanceThresholds.default
  }
  return districtDistanceThresholds.default
}

/**
 * 對給定地址進行地理編碼，並進行誤差校正。
 * @param {string} address - 需要地理編碼的地址。
 * @returns {Promise<{lat: number, lon: number}|null>} 包含經緯度的物件，或在失敗時返回 null。
 */
export async function geocodeAddress(address) {
  if (!address) {
    console.log('[geocodeAddress] 地址為空，跳過地理編碼。')
    return null
  }

  const queries = generateQueries(address)
  console.log(`[geocodeAddress] 嘗試為地址 "${address}" 進行地理編碼，生成查詢:`, queries)

  for (const query of queries) {
    const result = await queryNominatim(query)

    if (result) {
      const { lat, lon, address: resultAddress } = result

      // 從 Nominatim 結果中解析縣市和鄉鎮市區名稱
      // Nominatim 的地址結構可能因語言和數據源不同而異，這裡嘗試多種可能性
      const city = resultAddress?.county || resultAddress?.state || resultAddress?.city || ''
      const district =
        resultAddress?.suburb ||
        resultAddress?.city_district ||
        resultAddress?.town ||
        resultAddress?.village ||
        ''

      // 嘗試從 manualOverrides 獲取該縣市鄉鎮的中心點
      const override = manualOverrides?.[city]?.[district]

      if (override) {
        // 計算 Nominatim 結果與手動覆寫中心點的距離
        const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
        // 獲取該縣市鄉鎮的容忍閾值
        const threshold = getThreshold(city, district)

        if (dist > threshold) {
          console.log(
            `[geocodeAddress] 定位誤差過大！"${city}${district}" 地址經緯度 (${lat.toFixed(4)}, ${lon.toFixed(4)}) 距中心點 (${override.lat.toFixed(4)}, ${override.lon.toFixed(4)}) 距離 ${dist.toFixed(2)} 公里，超過閾值 ${threshold} 公里。已使用中心點座標。`,
          )
          return override // 使用手動覆寫的中心點座標
        } else {
          console.log(
            `[geocodeAddress] 定位誤差在容忍範圍內。"${city}${district}" 地址經緯度 (${lat.toFixed(4)}, ${lon.toFixed(4)}) 距中心點 ${dist.toFixed(2)} 公里，在閾值 ${threshold} 公里內。維持原始座標。`,
          )
          return { lat, lon } // 維持 Nominatim 提供的原始座標
        }
      } else {
        // 如果沒有找到對應的手動覆寫中心點，則直接使用 Nominatim 結果
        console.log(
          `[geocodeAddress] 未找到 "${city}${district}" 的手動中心點數據，使用 Nominatim 原始結果 (${lat.toFixed(4)}, ${lon.toFixed(4)})。`,
        )
        return { lat, lon }
      }
    }

    await delay(REQUEST_INTERVAL_MS) // 如果當前查詢失敗，延遲後嘗試下一個查詢
  }

  console.warn(`[geocodeAddress] 警告: 無法為地址 "${address}" 找到有效的地理編碼結果。`)
  return null
}
