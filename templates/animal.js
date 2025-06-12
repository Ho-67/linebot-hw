export default () => ({
  type: 'bubble',
  hero: {
    type: 'image',
    url: 'https://developers-resource.landpress.line.me/fx/img/01_2_restaurant.png',
    size: 'full',
    aspectRatio: '20:13',
    aspectMode: 'cover',
  },
  body: {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    contents: [
      {
        type: 'text',
        text: 'animal_subid',
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
                text: 'animal_Variety',
                size: 'sm',
                weight: 'bold',
                margin: 'sm',
                flex: 0,
              },
              {
                type: 'text',
                text: 'animal_age',
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
                text: 'animal_bodytype',
                size: 'sm',
                weight: 'bold',
                margin: 'sm',
                flex: 0,
              },
              {
                type: 'text',
                text: 'animal_sex',
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
                text: 'animal_bacterin',
                size: 'sm',
                weight: 'bold',
                margin: 'sm',
                flex: 0,
              },
              {
                type: 'text',
                text: 'animal_sterilization',
                size: 'sm',
                align: 'end',
                weight: 'bold',
              },
            ],
          },
        ],
      },
      {
        type: 'text',
        text: 'animal_remark',
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
        margin: 'none',
      },
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'shelter_name',
            margin: 'sm',
            size: 'md',
            align: 'center',
            weight: 'bold',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'shelter_address',
                wrap: true,
                size: 'sm',
                align: 'center',
              },
              {
                type: 'text',
                text: 'shelter_tel',
                size: 'sm',
                align: 'center',
                wrap: true,
              },
            ],
          },
          {
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
              },
            ],
          },
        ],
        margin: 'sm',
      },
    ],
  },
})
