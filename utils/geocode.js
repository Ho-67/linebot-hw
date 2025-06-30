import axios from 'axios'
import { manualOverrides } from './manualOverrides.js'
import { distance as calcDistance } from './distance.js'
import { districtDistanceThresholds } from './districtDistanceThresholds.js'

const MAX_ATTEMPTS = 3
const REQUEST_INTERVAL_MS = 1000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 判斷經緯度是否在台灣合理範圍
const isValidTaiwanLatLon = (lat, lon) => lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123

// 中文數字轉換（例：三十 → 30）
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

function normalizeTai(str) {
  return str?.replace(/臺/g, '台') || ''
}

// 多層地址查詢
function generateQueries(address) {
  if (!address) return []
  const converted = convertChineseNumbers(address)
  const normalized = converted.replace(/之\d+號/, '號')
  const queries = [normalized, normalized.replace(/\d+號.*/, ''), normalized.replace(/\d+巷.*/, '')]
  const noLane = normalized.replace(/\d+巷\d*之?\d*號?.*/, '')
  if (noLane !== normalized) queries.push(noLane)
  const townshipMatch = normalized.match(/^(.*?(縣|市).+?(鄉|鎮|市區))/)
  if (townshipMatch) queries.push(townshipMatch[0])
  const cityMatch = normalized.match(/^(.*?(縣|市))/)
  if (cityMatch) queries.push(cityMatch[0])
  return [...new Set(queries)].filter((q) => q.length > 5)
}

// 向 Nominatim 查詢經緯度
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
      if (res.data?.length > 0) {
        const { lat, lon, address } = res.data[0]
        const latNum = parseFloat(lat)
        const lonNum = parseFloat(lon)
        if (isValidTaiwanLatLon(latNum, lonNum)) {
          return { lat: latNum, lon: lonNum, address }
        }
      }
    } catch (e) {
      console.error(`[queryNominatim] 第 ${i + 1} 次失敗, 查詢: "${query}" 錯誤:`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

// 根據行政區取得距離容忍閾值
function getThreshold(city, district) {
  const setting = districtDistanceThresholds[city]
  if (!setting) return districtDistanceThresholds.default
  if (typeof setting === 'number') return setting
  if (typeof setting === 'object') {
    if (setting[district]) return setting[district]
    if (Array.isArray(setting) && setting.includes(district)) return 4
    return setting.default || districtDistanceThresholds.default
  }
  return districtDistanceThresholds.default
}

// 地址 → 經緯度主函式
export async function geocodeAddress(address, cache = {}) {
  if (!address) return null
  if (cache[address]) return cache[address]

  const queries = generateQueries(address)
  console.log(`[geocodeAddress] 嘗試為 "${address}" 生成查詢:`, queries)

  for (const query of queries) {
    const result = await queryNominatim(query)
    if (result) {
      const { lat, lon, address: addr } = result
      const city = addr?.county || addr?.state || addr?.city || ''
      let district =
        addr?.city_district || addr?.town || addr?.village || addr?.suburb || addr?.hamlet || ''

      if (!manualOverrides?.[city]?.[district]) {
        if (district !== addr?.town && addr?.town) district = addr.town
        else if (district !== addr?.city_district && addr?.city_district)
          district = addr.city_district
      }

      const override = manualOverrides?.[city]?.[district]
      if (override) {
        const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
        const threshold = getThreshold(normalizeTai(city), normalizeTai(district))
        if (dist > threshold) {
          console.log(`[geocodeAddress] 誤差 ${dist.toFixed(2)}km 超過 ${threshold}km，用中心點`)
          cache[address] = override
          return override
        } else {
          console.log(`[geocodeAddress] 定位可接受，使用原結果 (${lat}, ${lon})`)
          cache[address] = { lat, lon }
          return { lat, lon }
        }
      } else {
        console.log(`[geocodeAddress] 無手動中心點，使用 Nominatim 結果 (${lat}, ${lon})`)
        cache[address] = { lat, lon }
        return { lat, lon }
      }
    }
    await delay(REQUEST_INTERVAL_MS)
  }

  console.warn(`[geocodeAddress] 找不到 "${address}" 對應位置`)
  return null
}

// 經緯度 → 地址
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
      if (res.data?.address) return res.data.address
    } catch (e) {
      console.error(`[reverseGeocode] 第 ${i + 1} 次失敗:`, e.message)
    }
    await delay(REQUEST_INTERVAL_MS)
  }
  return null
}

// 驗證與修正位置
export async function validateAndFixLocation({ lat, lon }) {
  if (!isValidTaiwanLatLon(lat, lon)) {
    console.warn('[validateAndFixLocation] 經緯度不在台灣範圍:', lat, lon)
    return null
  }

  console.log(`[validateAndFixLocation] 反查 (${lat}, ${lon})`)
  const address = await reverseGeocode(lat, lon)
  if (!address) return null

  console.log('[validateAndFixLocation] 地址為:', address)
  const city = address.county || address.state || address.city || ''
  let district =
    address.city_district ||
    address.town ||
    address.village ||
    address.suburb ||
    address.hamlet ||
    ''

  if (!manualOverrides?.[city]?.[district]) {
    if (district !== address.town && address.town) district = address.town
    else if (district !== address.city_district && address.city_district)
      district = address.city_district
  }

  const override = manualOverrides?.[normalizeTai(city)]?.[normalizeTai(district)]
  if (override) {
    const dist = calcDistance(lat, lon, override.lat, override.lon, 'K')
    const threshold = getThreshold(normalizeTai(city), normalizeTai(district))
    if (dist > threshold) {
      console.log(`[validateAndFixLocation] 超出閾值，使用手動中心點`)
      return { city, district, lat: override.lat, lon: override.lon }
    }
  }

  return { city, district, lat, lon }
}

// 動物醫院配對
export function matchVetDataWithLocation(vetData, location, maxResults = 10) {
  const { city, district, lat: userLat, lon: userLon } = location

  const isDistrictRoughMatch = (a, b) => {
    if (!b || b.trim() === '') return true
    const clean = (s) => s.replace(/(區|鄉|鎮|市)$/, '')
    return clean(a) === clean(b)
  }

  const normalizeTai = (s) => s?.replace(/臺/g, '台') || ''
  const normalizeCity = normalizeTai
  const userCity = normalizeCity(city)
  const threshold = getThreshold(normalizeTai(city), normalizeTai(district))

  let filtered = vetData.filter((vet) => {
    const vetLat = Number(vet.Latitude)
    const vetLon = Number(vet.Longitude)
    if (isNaN(vetLat) || isNaN(vetLon)) return false
    if (!vet.縣市 || normalizeCity(vet.縣市) !== userCity) return false
    return isDistrictRoughMatch(normalizeTai(district), normalizeTai(vet.鄉鎮))
  })

  if (filtered.length === 0) {
    console.warn(`[matchVetDataWithLocation] 無模糊鄉鎮結果 → 只比對縣市`)
    filtered = vetData.filter(
      (vet) =>
        normalizeCity(vet.縣市) === userCity &&
        !isNaN(Number(vet.Latitude)) &&
        !isNaN(Number(vet.Longitude)),
    )
  }

  const withDistance = filtered
    .map((vet) => {
      const dist = calcDistance(userLat, userLon, Number(vet.Latitude), Number(vet.Longitude), 'K')
      return { ...vet, distance: dist }
    })
    .filter((vet) => vet.distance <= threshold)

  return withDistance.sort((a, b) => a.distance - b.distance).slice(0, maxResults)
}
