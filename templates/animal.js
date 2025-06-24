export default (value) => {
  try {
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

    const vaccineMap = {
      T: '是',
      F: '否',
    }

    const sterilizationMap = {
      T: '是',
      F: '否',
    }

    const safeText = (text) => {
      const cleaned = String(text || '').trim()
      return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '無資料'
    }

    // 定義一個名為 truncate 的函式，參數 text 為輸入字串，max 為最多顯示的字元數，預設為 40 字元
    const truncate = (text, max = 40) =>
      // 第一步：確保 text 是字串，如果是 null、undefined 或其他非字串值，就轉成空字串
      String(text || '')
        // 第二步：把字串中的換行符號 \n 換成空白，避免在 Flex Message 中出現斷行問題
        .replace(/\n/g, ' ')
        // 第三步：從開頭取出前 max 個字元（預設 40 個），多的就省略掉
        .slice(0, max)

    const imageUrl =
      safeText(value.album_file) ||
      'https://developers-resource.landpress.line.me/fx/img/01_2_restaurant.png'

    return {
      type: 'bubble',
      hero: {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '5:3',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          uri: imageUrl,
        },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        action: {
          type: 'uri',
          uri: 'https://line.me/',
        },
        contents: [
          {
            type: 'text',
            text: `收容編號：${safeText(value.animal_subid)}`,
            size: 'md',
            weight: 'bold',
            align: 'center',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: `品種：${safeText(value.animal_Variety) || '待確認'}`,
                    weight: 'bold',
                    flex: 0,
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `體型：${bodyTypeMap[value.animal_bodytype] || '待確認'}`,
                    size: 'sm',
                    align: 'end',
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: `年齡：${ageMap[value.animal_age] || '待確認'}`,
                    weight: 'bold',
                    flex: 0,
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `性別：${genderMap[value.animal_sex] || '待確認'}`,
                    size: 'sm',
                    align: 'end',
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: `施打狂犬疫苗：${vaccineMap[value.animal_bacterin] || '待確認'}`,
                    flex: 0,
                    weight: 'bold',
                    size: 'sm',
                  },
                  {
                    type: 'text',
                    text: `絕育：${sterilizationMap[value.animal_sterilization] || '待確認'}`,
                    size: 'sm',
                    weight: 'bold',
                    align: 'end',
                  },
                ],
              },
            ],
          },
          {
            type: 'text',
            text: `備註：${safeText(value.animal_remark)}`,
            wrap: true,
            color: '#999999',
            size: 'sm',
            maxLines: 5,
          },
        ],
        backgroundColor: '#f5f7e9',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'separator',
            margin: 'xs',
          },
          {
            type: 'text',
            text: safeText(value.shelter_name),
            size: 'md',
            weight: 'bold',
            align: 'center',
            wrap: true,
            offsetTop: 'md',
            margin: 'xs',
          },
          {
            type: 'text',
            text: `電話：${safeText(value.shelter_tel)}`,
            size: 'sm',
            align: 'center',
            offsetTop: 'sm',
            margin: 'xs',
          },
          {
            type: 'button',
            style: 'link',
            margin: 'xs',
            action: {
              type: 'uri',
              uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeText(value.shelter_name))}`,
              label: truncate(safeText(value.shelter_address), 40),
            },
            color: '#0b748a',
          },
        ],
        backgroundColor: '#f5f7e9',
      },
    }
  } catch (e) {
    console.error('[template/animal] Flex Bubble 產生錯誤:', e, value)
    throw e
  }
}
