import axios from 'axios'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { geocodeAddress } from '../utils/geocode.js'

// 獲取當前模組的目錄 (ES Module 寫法)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- 設定區塊 START ---
// 控制是否啟用測試模式
// 設為 true 則只處理 TEST_RECORD_LIMIT 筆資料
// 設為 false 則處理所有從 API 下載的資料
const TEST_MODE_ENABLED = false // <--- 設置為 true 進行測試，設為 false 處理全部資料
const TEST_RECORD_LIMIT = 10 // 當 TEST_MODE_ENABLED 為 true 時，要處理的資料筆數

const MOA_API_URL =
  'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078&IsTransData=1'
const PROCESSED_DATA_PATH = path.join(__dirname, '..', 'dump', 'preprocessed_vet_data.json')
const STATS_PATH = path.join(__dirname, '..', 'dump', 'preprocess_vet_stats.json')

const NOMINATIM_REQUEST_DELAY = 1100 // Nominatim 請求間隔，建議至少 1000ms (1秒)
const BATCH_SIZE = 100 // 每批處理筆數（可視情況調整）
// --- 設定區塊 END ---

// 讀取已處理資料（若檔案不存在回傳空陣列）
async function loadProcessedData() {
  try {
    const content = await fs.readFile(PROCESSED_DATA_PATH, 'utf8')
    return JSON.parse(content)
  } catch {
    // 檔案不存在或讀取錯誤，回傳空陣列，表示無已處理資料
    return []
  }
}

async function preprocessVetData() {
  console.log('--- 開始預處理動物醫院資料 ---')
  try {
    console.log(`1. 正在從 MOA API 下載原始資料: ${MOA_API_URL}`)
    const { data: rawVetData } = await axios.get(MOA_API_URL, {
      headers: {
        'User-Agent': `LineBot/1.0 ${process.env.CONTACT_EMAIL}`,
      },
    })
    console.log(` 成功下載 ${rawVetData.length} 筆原始資料`)

    let dataToProcess = rawVetData
    let currentRunType = '完整處理'
    if (TEST_MODE_ENABLED) {
      dataToProcess = rawVetData.slice(0, TEST_RECORD_LIMIT)
      currentRunType = `測試模式 (前 ${TEST_RECORD_LIMIT} 筆)`
    }

    // --- 嘗試讀取已處理資料 ---
    const processedData = await loadProcessedData()
    const processedCount = processedData.length
    if (processedCount > 0) {
      console.log(
        `讀取到已處理資料 ${processedCount} 筆，將從第 ${processedCount + 1} 筆繼續處理。`,
      )
    }

    let geocodedCount = 0
    let skippedCount = 0
    let existingCoordCount = 0

    // 計算已處理資料中已有經緯度筆數
    for (const vet of processedData) {
      if (vet.Latitude && vet.Longitude) existingCoordCount++
    }

    console.log(`2. 正在進行資料處理及地理編碼 (${currentRunType})...`)

    for (
      let batchStart = processedCount;
      batchStart < dataToProcess.length;
      batchStart += BATCH_SIZE
    ) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, dataToProcess.length)
      const batch = dataToProcess.slice(batchStart, batchEnd)

      for (let i = 0; i < batch.length; i++) {
        const vet = batch[i]
        let lat = vet.Latitude
        let lon = vet.Longitude

        // 檢查原始資料是否有經緯度
        if (lat && lon) {
          existingCoordCount++
        } else {
          // 若無經緯度，呼叫地理編碼函式
          const geo = await geocodeAddress(vet.機構地址)
          if (geo) {
            vet.Latitude = geo.lat
            vet.Longitude = geo.lon
            geocodedCount++
          } else {
            skippedCount++
            console.warn(
              `[${batchStart + i + 1}/${dataToProcess.length}] 警告: 無法地理編碼 - "${vet.機構地址}"，此筆資料跳過。`,
            )
            continue // 跳過此筆資料，不加入 processedData
          }
          // 每次對 Nominatim 發出請求後等待，以避免超出速率限制
          await new Promise((resolve) => setTimeout(resolve, NOMINATIM_REQUEST_DELAY))
        }
        processedData.push(vet)

        const logInterval = TEST_MODE_ENABLED ? 1 : 100
        if (
          (batchStart + i + 1) % logInterval === 0 ||
          batchStart + i + 1 === dataToProcess.length
        ) {
          console.log(` 進度: ${batchStart + i + 1} / ${dataToProcess.length} 筆已處理`)
        }
      }

      // 每批結束時定時保存當前進度和統計數據，防止意外中斷導致資料遺失
      await fs.writeFile(PROCESSED_DATA_PATH, JSON.stringify(processedData, null, 2), 'utf8')
      const stats = {
        totalInputRecords: dataToProcess.length,
        originalWithCoords: existingCoordCount,
        geocodedByAddress: geocodedCount,
        skipped: skippedCount,
        savedToOutput: processedData.length,
        lastUpdated: new Date().toISOString(),
        runMode: currentRunType,
      }
      await fs.writeFile(STATS_PATH, JSON.stringify(stats, null, 2), 'utf8')
      console.log(
        ` 已保存進度至 ${PROCESSED_DATA_PATH} 與 ${STATS_PATH} （處理至第 ${batchEnd} 筆）`,
      )
    }

    console.log('3. 資料處理完成。')
    console.log(` - 原始資料已有經緯度數量: ${existingCoordCount} 筆`)
    console.log(` - 透過地址成功地理編碼數量: ${geocodedCount} 筆`)
    console.log(` - 因無法地理編碼而跳過數量: ${skippedCount} 筆`)
    console.log(` - 最終處理並保存的資料數量: ${processedData.length} 筆`)

    console.log(`4. 正在將處理後的資料保存到 ${PROCESSED_DATA_PATH}`)
    await fs.writeFile(PROCESSED_DATA_PATH, JSON.stringify(processedData, null, 2), 'utf8')
    await fs.writeFile(
      STATS_PATH,
      JSON.stringify(
        {
          totalInputRecords: dataToProcess.length,
          originalWithCoords: existingCoordCount,
          geocodedByAddress: geocodedCount,
          skipped: skippedCount,
          savedToOutput: processedData.length,
          lastUpdated: new Date().toISOString(),
          runMode: currentRunType,
        },
        null,
        2,
      ),
      'utf8',
    )
    console.log(' 預處理資料保存成功。')
  } catch (error) {
    console.error('預處理資料時發生錯誤:', error)
    if (error.response) {
      console.error('API 響應錯誤狀態:', error.response.status)
      console.error('API 響應資料:', error.response.data)
    }
  } finally {
    console.log('--- 預處理完成 ---')
  }
}

preprocessVetData()
