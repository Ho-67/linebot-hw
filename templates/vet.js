const safeText = (text) => {
  const cleaned = String(text || '').trim()
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '無資料'
}

const truncate = (text, max = 40) =>
  String(text || '')
    .replace(/\n/g, ' ')
    .slice(0, max)

export default (value = {}) => {
  const phone = (value.機構電話 || '').replace(/[^\d]/g, '')
  const phoneUri = phone ? `tel:${phone}` : 'tel:'

  return {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: truncate(safeText(value.機構名稱), 40),
          weight: 'bold',
          size: 'lg',
          color: '#ffffff',
          wrap: true,
          align: 'center',
          maxLines: 2,
        },
        {
          type: 'text',
          text: truncate(safeText(value.機構地址), 40),
          color: '#eae0e0',
          wrap: true,
          align: 'center',
          size: 'sm',
          maxLines: 2,
        },
        {
          type: 'text',
          text:
            value.distance !== undefined && value.distance !== null
              ? `距離：約 ${value.distance.toFixed(1)} 公里`
              : '距離資料缺失',
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
          style: phone ? 'link' : 'secondary',
          height: 'sm',
          action: {
            type: 'uri',
            uri: phoneUri,
            label: phone ? truncate(`撥打：${value.機構電話}`, 30) : '電話無效',
          },
          color: '#9b1c09',
          enabled: !!phone,
        },
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: 'Google地圖',
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(truncate(safeText(value.機構名稱), 40))}`,
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
}
