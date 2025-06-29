export default (value) => {
  try {
    const safeText = (text) => {
      const cleaned = String(text || '').trim()
      return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '無資料'
    }

    const truncate = (text, max = 60) =>
      String(text || '')
        .replace(/\n/g, ' ')
        .slice(0, max)

    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: truncate(safeText(value.name)),
            weight: 'bold',
            size: 'lg',
            color: '#ffffff',
            wrap: true,
            align: 'center',
            maxLines: 2,
          },
          {
            type: 'text',
            text: truncate(safeText(value.address)),
            color: '#eae0e0',
            wrap: true,
            align: 'center',
            size: 'sm',
            maxLines: 2,
          },
          {
            type: 'text',
            text: `距離 ${safeText(value.distance)}`,
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
              uri: safeText(value.phoneUrl),
              label: '機構電話',
            },
            color: '#9b1c09',
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              uri: safeText(value.mapUrl),
              label: 'Google地圖',
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
