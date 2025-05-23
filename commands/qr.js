export default async (event) => {
  await event.reply({
    type: 'text',
    text: '請選擇',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            // 按鈕文字
            label: '狗',
            // 傳去postback事件的資料
            data: '狗',
            // 使用者傳送的文字
            displayText: '狗',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '貓',
            data: '貓',
            displayText: '貓',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '其他',
            data: '其他',
            displayText: '其他',
          },
        },
      ],
    },
  })
}
