import axios from 'axios'
import { promises as fs } from 'fs'
import { geocodeAddress } from '../utils/geocode.js'

const MOA_API_URL =
  'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078&IsTransData=1'
const PROCESSED_DATA_PATH = '../dump/preprocessed_vet_data.json'
const STATS_PATH = '../dump/preprocess_vet_stats.json'

const NOMINATIM_REQUEST_DELAY = 1200

async function preprocessVetData() {
  console.log('--- 開始預處理動物醫院資料 ---')
  try {
    console.log(`1. 正在從 MOA API 下載原始資料: ${MOA_API_URL}`)
    const { data: rawVetData } = await axios.get(MOA_API_URL)
    console.log(`   成功下載 ${rawVetData.length} 筆資料。`)

    const processedData = []
    let geocodedCount = 0
    let skippedCount = 0

    console.log('2. 正在處理資料並進行地理編碼...')
    for (let i = 0; i < rawVetData.length; i++) {
      const vet = rawVetData[i]
      let lat = vet.Latitude
      let lon = vet.Longitude

      if (!lat || !lon) {
        const geo = await geocodeAddress(vet.機構地址)
        if (geo) {
          vet.Latitude = geo.lat
          vet.Longitude = geo.lon
          geocodedCount++
        } else {
          skippedCount++
          console.warn(
            `[${i + 1}/${rawVetData.length}] 警告: 查無經緯度 - "${vet.機構地址}"，此筆資料跳過。`,
          )
          continue
        }
        await new Promise((resolve) => setTimeout(resolve, NOMINATIM_REQUEST_DELAY))
      }
      processedData.push(vet)

      if ((i + 1) % 100 === 0) {
        console.log(`   已處理 ${i + 1} / ${rawVetData.length} 筆`)
      }
    }

    console.log('3. 資料處理完成。')
    console.log(`   - 透過地址成功地理編碼數量: ${geocodedCount} 筆`)
    console.log(`   - 因無法地理編碼而跳過數量: ${skippedCount} 筆`)
    console.log(`   - 最終處理並保存的資料數量: ${processedData.length} 筆`)

    console.log(`4. 正在將處理後的資料保存到 ${PROCESSED_DATA_PATH}`)
    await fs.writeFile(PROCESSED_DATA_PATH, JSON.stringify(processedData, null, 2), 'utf8')
    console.log('   預處理資料保存成功。')

    const stats = {
      total: rawVetData.length,
      geocoded: geocodedCount,
      skipped: skippedCount,
      saved: processedData.length,
      lastUpdated: new Date().toISOString(),
    }
    await fs.writeFile(STATS_PATH, JSON.stringify(stats, null, 2), 'utf8')
    console.log(`   統計數據已保存至 ${STATS_PATH}`)
  } catch (error) {
    console.error('預處理資料時發生錯誤:', error)
  } finally {
    console.log('--- 預處理完成 ---')
  }
}

preprocessVetData()
