export default () => ({
  type: 'bubble',
  size: 'kilo',
  header: {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: '機構名稱',
        color: '#ffffff',
        size: 'lg',
        wrap: true,
        weight: 'bold',
      },
      {
        type: 'text',
        text: '機構電話',
        color: '#ffffff',
        size: 'md',
        wrap: true,
        maxLines: 2,
      },
      {
        type: 'text',
        text: '機構地址',
        color: '#0e3c3f',
        size: 'sm',
        wrap: true,
        maxLines: 2,
      },
      {
        type: 'text',
        text: '距離 1.5 公里',
        color: '#ffffff',
        size: 'sm',
        wrap: true,
      },
    ],
    backgroundColor: '#27ACB2',
    paddingTop: '19px',
    paddingAll: '12px',
    paddingBottom: '16px',
  },
  body: {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'button',
        action: {
          type: 'uri',
          label: 'Google地圖',
          uri: 'http://linecorp.com/',
        },
        style: 'primary',
        margin: 'sm',
      },
      {
        type: 'button',
        action: {
          type: 'uri',
          label: '撥打電話',
          uri: 'tel:0000000000',
        },
        style: 'secondary',
        margin: 'sm',
      },
    ],
    spacing: 'sm',
    paddingAll: '12px',
  },
  styles: {
    footer: {
      separator: false,
    },
  },
})
