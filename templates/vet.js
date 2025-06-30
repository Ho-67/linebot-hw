const safeText = (text) => {
  const cleaned = String(text || '').trim()
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '無資料'
}

const truncate = (text, max = 40) =>
  String(text || '')
    .replace(/\n/g, ' ')
    .slice(0, max)

export default (value = {}) => ({
  type: 'bubble',
  body: {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: safeText(value.機構名稱),
        weight: 'bold',
        size: 'lg',
        color: '#ffffff',
        wrap: true,
        align: 'center',
        maxLines: 2,
      },
      {
        type: 'text',
        text: safeText(value.機構地址),
        color: '#eae0e0',
        wrap: true,
        align: 'center',
        size: 'sm',
        maxLines: 2,
      },
      {
        type: 'text',
        text: value.distance ? `距離：約 ${value.distance.toFixed(1)} 公里` : '距離資料缺失',
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
          uri: `tel:${(value.機構電話 || '').replace(/[^\d]/g, '')}`,
          label: value.機構電話 ? `撥打：${value.機構電話}` : '撥打電話',
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
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeText(value.機構名稱))}`,
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
})
