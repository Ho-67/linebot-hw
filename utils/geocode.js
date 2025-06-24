import axios from 'axios'

export async function geocodeAddress(address) {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': `LineBot/1.0 (${process.env.CONTACT_EMAIL})`,
      },
    })
    const result = res.data[0]
    if (result) {
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      }
    }
  } catch (e) {
    console.error('[geocodeAddress] 錯誤:', e)
  }
  return null
}
