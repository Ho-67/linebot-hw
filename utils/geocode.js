import axios from 'axios'
import { manualOverrides } from './manualOverrides.js'
import { distance as calcDistance } from './distance.js'
import { districtDistanceThresholds } from './districtDistanceThresholds.js'

const MAX_ATTEMPTS = 3
const REQUEST_INTERVAL_MS = 1000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 判斷經緯度是否在台灣合理範圍
const isValidTaiwanLatLon = (lat, lon) => lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123

// 轉換中文數字，提升地址搜尋成功率
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

// 產生多層地址查詢字串（長度>5避免過短查詢）
function generateQueries(address) {
  if (!address) return []
  const converted = convertChineseNumbers(address)
  const normalizedAddress = converted.replace(/之\d+號/, '號')
  const queries = []
  queries.push(normalizedAddress)
  queries.push(normalizedAddress.replace(/\d+號.*/, ''))
  queries.push(normalizedAddress.replace(/\d+巷.*/, ''))
  const noLane = normalizedAddress.replace(/\d+巷\d*之?\d*號?.*/, '')
  if (noLane !== normalizedAddress) queries.push(noLane)
  const townshipMatch = normalizedAddress.match(/^(.*?(縣|市).+?(鄉|鎮|市區))/)
  if (townshipMatch) queries.push(townshipMatch[0])
  const cityMatch = normalizedAddress.match(/^(.*?(縣|市))/)
  if (cityMatch) queries.push(cityMatch[0])
  return [...new Set(queries)].filter((q) => q.length > 5)
}

// 使用 Nominatim API 查詢地址經緯度
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

// 取得距離容忍閾值
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

// 地址字串轉經緯度，含多層查詢及手動中心點修正
export async function geocodeAddress(address, cache = {}) {
  if (!address) {
    console.log('[geocodeAddress] 地址為空，跳過地理編碼。')
    return null
  }
  if (cache[address]) {
    return cache[address]
  }
  const queries = generateQueries(address)
  console.log(`[geocodeAddress] 嘗試為地址 "${address}" 進行地理編碼，生成查詢:`, queries)
  for (const query of queries) {
    const result = await queryNominatim(query)
    if (result) {
      const { lat, lon, address: resultAddress } = result
      const city = resultAddress?.county || resultAddress?.state || resultAddress?.city || ''
      let district =
        resultAddress?.city_district ||
        resultAddress?.town ||
        resultAddress?.village ||
        resultAddress?.suburb ||
        resultAddress?.hamlet ||
        ''
      const fallbackDistrict = district
      if (!manualOverrides?.[city]?.[district]) {
        if (district !== resultAddress?.town && resultAddress?.town) {
          district = resultAddress.town
        } else if (district !== resultAddress?.city_district && resultAddress?.city_district) {
          district = resultAddress.city_district
        }
      }
      const override = manualOverrides?.[city]?.[district]
      if (override) {
        const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
        const threshold = getThreshold(city, district)
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

// 經緯度反查地址（用於校正使用者位置）
export async function reverseGeocode(lat, lon) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon,
          format: 'json',
          addressdetails: 1,
          zoom: 10,
          countrycodes: 'tw',
        },
        headers: {
          'User-Agent': `LineBot/1.0 ${process.env.CONTACT_EMAIL}`,
        },
      })
      if (res.data && res.data.address) {
        return res.data.address
      }
    } catch (e) {
      console.error(`[reverseGeocode] 嘗試失敗 (第${i + 1}次), 錯誤:`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

// 驗證並修正使用者位置，回傳縣市、鄉鎮、經緯度
export async function validateAndFixLocation(location) {
  const { lat, lon } = location
  if (!isValidTaiwanLatLon(lat, lon)) {
    console.warn('[validateAndFixLocation] 經緯度不在台灣合理範圍:', lat, lon)
    return null
  }
  console.log(`[validateAndFixLocation] 開始反查地址，經緯度: (${lat}, ${lon})`)
  const address = await reverseGeocode(lat, lon)
  if (!address) {
    console.warn('[validateAndFixLocation] 無法取得反查地址')
    return null
  }
  console.log('[validateAndFixLocation] 反查地址成功:', address)
  const city = address.county || address.state || address.city || ''
  let district =
    address.city_district ||
    address.town ||
    address.village ||
    address.suburb ||
    address.hamlet ||
    ''
  // 嘗試修正 district 名稱，確保有 manualOverrides 對應
  if (!manualOverrides?.[city]?.[district]) {
    if (district !== address.town && address.town) {
      district = address.town
    } else if (district !== address.city_district && address.city_district) {
      district = address.city_district
    }
  }
  const override = manualOverrides?.[city]?.[district]
  if (override) {
    const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
    const threshold = getThreshold(city, district)
    if (dist > threshold) {
      console.log(
        `[validateAndFixLocation] 定位誤差過大！"${city}${district}" Nominatim經緯度(${lat.toFixed(
          6,
        )},${lon.toFixed(6)}) 距中心點(${override.lat.toFixed(6)},${override.lon.toFixed(6)})距離 ${dist.toFixed(
          2,
        )} 公里，使用手動中心點。閾值：${threshold} 公里。`,
      )
      return {
        city,
        district,
        lat: override.lat,
        lon: override.lon,
      }
    } else {
      console.log(
        `[validateAndFixLocation] 定位誤差可接受，使用 Nominatim 經緯度 (${lat.toFixed(6)}, ${lon.toFixed(
          6,
        )})，縣市鄉鎮: ${city} ${district}`,
      )
      return {
        city,
        district,
        lat,
        lon,
      }
    }
  } else {
    console.log(
      `[validateAndFixLocation] 找不到手動覆蓋，回傳原始位置 (${lat.toFixed(6)}, ${lon.toFixed(6)})`,
    )
    return {
      city,
      district,
      lat,
      lon,
    }
  }
}

// 雙重條件(縣市鄉鎮 + 距離)比對動物醫院清單，回傳最近 maxResults 筆（支援模糊鄉鎮名稱）
export function matchVetDataWithLocation(vetData, location, maxResults = 10) {
  const { city, district, lat: userLat, lon: userLon } = location

  // 模糊鄉鎮比對：去掉「區」、「鄉」、「鎮」、「市」等尾字來比
  function isDistrictRoughMatch(userDistrict, vetDistrict) {
    if (!vetDistrict) return true // 如果原始資料沒填寫鄉鎮，放行比對
    const clean = (str) => str.replace(/(區|鄉|鎮|市)$/, '')
    return clean(userDistrict) === clean(vetDistrict)
  }

  // 篩選符合縣市與模糊鄉鎮的資料
  const filtered = vetData.filter((vet) => {
    const vetLat = Number(vet.Latitude)
    const vetLon = Number(vet.Longitude)
    if (isNaN(vetLat) || isNaN(vetLon)) return false
    if (!vet.縣市 || vet.縣市 !== city) return false
    if (!isDistrictRoughMatch(district, vet.鄉鎮)) return false
    return true
  })

  const threshold = getThreshold(city, district)

  const withDistance = filtered
    .map((vet) => {
      const vetLat = Number(vet.Latitude)
      const vetLon = Number(vet.Longitude)
      const dist = calcDistance(userLat, userLon, vetLat, vetLon, 'K')
      return { ...vet, distance: dist }
    })
    .filter((vet) => vet.distance <= threshold)

  return withDistance.sort((a, b) => a.distance - b.distance).slice(0, maxResults)
}
