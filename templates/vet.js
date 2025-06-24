export default () => ({
  type: 'bubble',
  body: {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: '機構名稱',
        weight: 'bold',
        size: 'lg',
        color: '#ffffff',
        wrap: true,
        align: 'center',
        maxLines: 2,
      },
      {
        type: 'text',
        text: '機構地址',
        color: '#eae0e0',
        wrap: true,
        align: 'center',
        size: 'sm',
        maxLines: 2,
      },
      {
        type: 'text',
        text: '距離',
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
          uri: 'https://line.me/',
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
          label: 'Google地圖',
          uri: 'https://line.me/',
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
