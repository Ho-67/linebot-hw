import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/animal.js'

const ageMap = {
  ADULT: '已成年',
  CHILD: '未成年',
}

const genderMap = {
  F: '母',
  M: '公',
}

const bodyTypeMap = {
  SMALL: '小',
  MEDIUM: '中',
  BIG: '大',
}

// 將中文選項轉成API用的T/F
const vaccineMap = {
  是: 'T',
  否: 'F',
}

const sterilizationMap = {
  是: 'T',
  否: 'F',
}

export default async (event, type = null) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1',
    )

    console.log('取得資料筆數:', data.length)

    let filtered = data

    if (event.message?.type === 'location') {
      const userLat = event.message.latitude
      const userLng = event.message.longitude

      filtered = data
        .map((item) => {
          const lat = Number(item.Latitude)
          const lng = Number(item.Longitude)
          item.distance = distance(lat, lng, userLat, userLng, 'K')
          return item
        })
        .filter((item) => !isNaN(item.distance))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)

      console.log('位置查詢篩選後筆數:', filtered.length)
    } else if (Array.isArray(type)) {
      const [animalType, regionBig, city, age, bodytype, sex, vaccine, sterilization] = type

      filtered = data
        .filter((item) => {
          const kindMatch =
            animalType === '狗'
              ? item.animal_kind === '狗'
              : animalType === '貓'
                ? item.animal_kind === '貓'
                : item.animal_kind !== '狗' && item.animal_kind !== '貓'

          const cityMatch = item.shelter_address?.includes(city)

          const ageMatch = ageMap[item.animal_age] === age

          const bodyMatch = bodyTypeMap[item.animal_bodytype] === bodytype

          const sexMatch = genderMap[item.animal_sex] === sex

          const vaccineMatch = vaccine ? item.animal_bacterin === vaccineMap[vaccine] : true

          const sterilizationMatch = sterilization
            ? item.animal_sterilization === sterilizationMap[sterilization]
            : true

          // 除錯用
          // console.log({ kindMatch, cityMatch, ageMatch, bodyMatch, sexMatch, vaccineMatch, sterilizationMatch, animal_id: item.animal_id })

          return (
            kindMatch &&
            cityMatch &&
            ageMatch &&
            bodyMatch &&
            sexMatch &&
            vaccineMatch &&
            sterilizationMatch
          )
        })
        .slice(0, 5)

      console.log('條件過濾後筆數:', filtered.length)
    }

    if (filtered.length === 0) {
      return await event.reply('抱歉，目前沒有找到符合條件的動物')
    }

    const bubbles = filtered
      .map((value) => {
        try {
          return template(value)
        } catch (e) {
          console.error('Flex Bubble 產生錯誤：', e, value)
          return null
        }
      })
      .filter(Boolean)

    if (bubbles.length === 0) {
      return await event.reply('目前沒有可以顯示的動物資料')
    }

    await event.reply({
      type: 'flex',
      altText: '認領養動物列表',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    })
  } catch (error) {
    console.error('commandAnimal 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
