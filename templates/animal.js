export default (value) => {
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

  const imageUrl =
    safeText(value.album_file) || 'https://via.placeholder.com/1024x720?text=No+Image'

  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: imageUrl,
      size: 'full',
      aspectRatio: '16:13',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        label: '放大圖片',
        uri: imageUrl,
      },
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: `收容編號：${safeText(value.animal_subid)}`,
          size: 'md',
          weight: 'bold',
          align: 'center',
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
                  text: `品種：${safeText(value.animal_Variety)}`,
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `年齡：${ageMap[value.animal_age] || safeText(value.animal_age)}`,
                  size: 'sm',
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: `體型：${bodyTypeMap[value.animal_bodytype] || safeText(value.animal_bodytype)}`,
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `性別：${genderMap[value.animal_sex] || safeText(value.animal_sex)}`,
                  size: 'sm',
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: `施打狂犬疫苗：${vaccineMap[value.animal_bacterin] || safeText(value.animal_bacterin)}`,
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: `絕育：${sterilizationMap[value.animal_sterilization] || safeText(value.animal_sterilization)}`,
                  size: 'sm',
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
          color: '#aaaaaa',
          size: 'xs',
          margin: 'md',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'separator',
        },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: safeText(value.shelter_name),
              align: 'center',
              weight: 'bold',
              size: 'md',
            },
            {
              type: 'text',
              text: safeText(value.shelter_address),
              wrap: true,
              size: 'sm',
              align: 'center',
            },
            {
              type: 'text',
              text: `電話：${safeText(value.shelter_tel)}`,
              wrap: true,
              size: 'sm',
              align: 'center',
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'Google地圖',
                uri: `https://www.google.com/maps/place/${encodeURIComponent(safeText(value.shelter_address))}`,
              },
            },
          ],
        },
      ],
    },
  }
}
