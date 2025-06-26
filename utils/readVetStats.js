import { promises as fs } from 'fs'

export async function readVetStats() {
  try {
    const raw = await fs.readFile('./preprocess_vet_stats.json', 'utf8')
    const stats = JSON.parse(raw)

    // 將 ISO 時間轉為台灣時間格式
    const updated = new Date(stats.lastUpdated)
    const formattedTime = updated.toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    console.log('動物醫院資料統計：')
    console.log(`原始資料數：${stats.total}`)
    console.log(`成功地理編碼：${stats.geocoded}`)
    console.log(`跳過失敗筆數：${stats.skipped}`)
    console.log(`實際儲存筆數：${stats.saved}`)
    console.log(`最後更新時間：${formattedTime}`)

    return stats
  } catch (err) {
    console.warn('無法讀取預處理統計資料:', err.message)
    return null
  }
}
