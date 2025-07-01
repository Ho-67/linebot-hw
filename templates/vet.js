export default (value) => {
  try {
    const safeText = (text) => {
      const cleaned = String(text || '').trim()
      return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '無資料'
    }

    // 加強電話處理
    const rawPhone = safeText(value.phone)
    const phoneUri =
      rawPhone && rawPhone !== '無資料' ? `tel:${rawPhone.replace(/[^\d]/g, '')}` : ''
    const phoneLabel = rawPhone && rawPhone !== '無資料' ? `撥打：${rawPhone}` : '撥打電話'

    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: safeText(value.name),
            weight: 'bold',
            size: 'lg',
            color: '#ffffff',
            wrap: true,
            align: 'center',
            maxLines: 2,
          },
          {
            type: 'text',
            text: safeText(value.address),
            color: '#eae0e0',
            wrap: true,
            align: 'center',
            size: 'sm',
            maxLines: 2,
          },
          {
            type: 'text',
            text: `距離：約 ${safeText(value.distance)} 公里`,
            size: 'md',
            color: '#fff8f0',
            align: 'center',
          },
        ],
        paddingBottom: '16px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              uri: phoneUri,
              label: phoneLabel,
            },
            color: '#9b1c09',
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'Google地圖',
              uri: safeText(value.mapUrl),
            },
            color: '#14207a',
          },
        ],
        flex: 0,
      },
      styles: {
        body: {
          backgroundColor: '#216788',
        },
        footer: {
          backgroundColor: '#bbccda',
        },
      },
    }
  } catch (e) {
    console.error('[template/vet] Flex Bubble 產生錯誤:', e, value)
    throw e
  }
}
