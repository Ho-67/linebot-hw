import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function readVetStats() {
  try {
    const statsPath = join(__dirname, '../dump/preprocess_vet_stats.json')
    const raw = await fs.readFile(statsPath, 'utf8')
    const stats = JSON.parse(raw)

    // 將 ISO 時間轉為台灣時間格式
    const updated = new Date(stats.lastUpdated)
    const formattedTime = updated.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei', // 確保使用台灣時區
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // 使用 24 小時制
    })

    console.log('--- 動物醫院資料處理統計 ---')
    console.log(`運行模式：${stats.runMode || 'N/A'}`) // 新增運行模式
    console.log(`總輸入資料數：${stats.totalInputRecords}`)
    console.log(`原始資料已有經緯度：${stats.originalWithCoords}`)
    console.log(`透過地址成功地理編碼：${stats.geocodedByAddress}`)
    console.log(`因無法地理編碼而跳過：${stats.skipped}`)
    console.log(`最終儲存筆數：${stats.savedToOutput}`)
    console.log(`最後更新時間：${formattedTime}`)
    console.log('---------------------------')

    return stats
  } catch (err) {
    console.warn(`無法讀取預處理統計資料: ${err.message}`)
    console.warn('請確認已成功運行 preprocessVets.js 腳本。')
    return null
  }
}

readVetStats()
