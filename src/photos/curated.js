// Fotos reales de Perseverance elegidas a mano el 11 nov 2026 de la API de imágenes crudas de la NASA
// (https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2&order=sol+desc).
// Criterio: a color, que se sienta Marte (horizonte, el brazo sobre el suelo, rocas de cerca);
// sin cielo vacío, sol, calibración, miniaturas ni tiras. Los datos de cada foto son los que da la API.
export const PHOTOS = {
  "mastcam": [
    {
      "id": "ZL0_2011_0845467071_928EBY_N0920000ZCAM10043_1100LMJ",
      "title": "Roca en capas, de cerca",
      "sol": 2011,
      "taken": "2026-10-17T00:23:17.385Z",
      "instrument": "MCZ_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02011/ids/edr/browse/zcam/ZL0_2011_0845467071_928EBY_N0920000ZCAM10043_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2011_0845467071_928EBY_N0920000ZCAM10043_1100LMJ"
    },
    {
      "id": "ZL0_2024_0846622583_145EBY_N0930000ZCAM10058_1100LMJ",
      "title": "Roca llena de agujeros",
      "sol": 2024,
      "taken": "2026-10-30T09:21:53.576Z",
      "instrument": "MCZ_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02024/ids/edr/browse/zcam/ZL0_2024_0846622583_145EBY_N0930000ZCAM10058_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2024_0846622583_145EBY_N0930000ZCAM10058_1100LMJ"
    },
    {
      "id": "ZL0_2019_0846179633_614EBY_N0920000ZCAM10050_1100LMJ",
      "title": "Ladera rocosa hacia el horizonte",
      "sol": 2019,
      "taken": "2026-10-25T06:19:15.051Z",
      "instrument": "MCZ_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02019/ids/edr/browse/zcam/ZL0_2019_0846179633_614EBY_N0920000ZCAM10050_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2019_0846179633_614EBY_N0920000ZCAM10050_1100LMJ"
    },
    {
      "id": "ZR0_2019_0846179952_818EBY_N0920000ZCAM10051_0630LMJ",
      "title": "Huellas de Percy junto a una roca",
      "sol": 2019,
      "taken": "2026-10-25T06:24:37.059Z",
      "instrument": "MCZ_RIGHT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02019/ids/edr/browse/zcam/ZR0_2019_0846179952_818EBY_N0920000ZCAM10051_0630LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZR0_2019_0846179952_818EBY_N0920000ZCAM10051_0630LMJ"
    },
    {
      "id": "ZL0_2023_0846533115_473EBY_N0930000ZCAM10057_1100LMJ",
      "title": "Campo de rocas claras",
      "sol": 2023,
      "taken": "2026-10-29T08:30:50.868Z",
      "instrument": "MCZ_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/zcam/ZL0_2023_0846533115_473EBY_N0930000ZCAM10057_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2023_0846533115_473EBY_N0930000ZCAM10057_1100LMJ"
    }
  ],
  "navcam": [
    {
      "id": "NRF_2010_0845369992_991ECM_N0920000NCAM13009_01_195J",
      "title": "La cubierta de Percy frente a una colina",
      "sol": 2010,
      "taken": "2026-10-15T21:25:00.091Z",
      "instrument": "NAVCAM_RIGHT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02010/ids/edr/browse/ncam/NRF_2010_0845369992_991ECM_N0920000NCAM13009_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NRF_2010_0845369992_991ECM_N0920000NCAM13009_01_195J"
    },
    {
      "id": "NLF_2011_0845478216_410ECM_N0920000NCAM00347_01_195J",
      "title": "El brazo extendido sobre el suelo",
      "sol": 2011,
      "taken": "2026-10-17T03:28:44.295Z",
      "instrument": "NAVCAM_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02011/ids/edr/browse/ncam/NLF_2011_0845478216_410ECM_N0920000NCAM00347_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2011_0845478216_410ECM_N0920000NCAM00347_01_195J"
    },
    {
      "id": "NLF_2022_0846447991_222ECM_N0930000NCAM03022_04_190J",
      "title": "Colina en el horizonte",
      "sol": 2022,
      "taken": "2026-10-28T08:51:46.923Z",
      "instrument": "NAVCAM_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/ncam/NLF_2022_0846447991_222ECM_N0930000NCAM03022_04_190J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2022_0846447991_222ECM_N0930000NCAM03022_04_190J"
    },
    {
      "id": "NLF_2023_0846549056_005ECM_N0930000NCAM00709_05_095J",
      "title": "El brazo con el logo 2020",
      "sol": 2023,
      "taken": "2026-10-29T12:56:14.159Z",
      "instrument": "NAVCAM_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/ncam/NLF_2023_0846549056_005ECM_N0930000NCAM00709_05_095J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2023_0846549056_005ECM_N0930000NCAM00709_05_095J"
    },
    {
      "id": "NLF_2022_0846456110_237ECM_N0930000NCAM02022_07_195J",
      "title": "Rueda y cubierta sobre terreno rocoso",
      "sol": 2022,
      "taken": "2026-10-28T11:07:05.389Z",
      "instrument": "NAVCAM_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/ncam/NLF_2022_0846456110_237ECM_N0930000NCAM02022_07_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2022_0846456110_237ECM_N0930000NCAM02022_07_195J"
    },
    {
      "id": "NLF_2011_0845478854_034ECM_N0920000NCAM00709_06_095J",
      "title": "La sombra de Percy sobre una pared de roca",
      "sol": 2011,
      "taken": "2026-10-17T03:39:21.688Z",
      "instrument": "NAVCAM_LEFT",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02011/ids/edr/browse/ncam/NLF_2011_0845478854_034ECM_N0920000NCAM00709_06_095J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2011_0845478854_034ECM_N0920000NCAM00709_06_095J"
    }
  ],
  "hazcam": [
    {
      "id": "FLF_2014_0845735562_034ECM_N0920000FHAZ00206_01_295J",
      "title": "La torreta del brazo, con una colina detrás",
      "sol": 2014,
      "taken": "2026-10-20T02:57:51.960Z",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02014/ids/edr/browse/fcam/FLF_2014_0845735562_034ECM_N0920000FHAZ00206_01_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2014_0845735562_034ECM_N0920000FHAZ00206_01_295J"
    },
    {
      "id": "FLF_2023_0846549745_302ECM_N0930000FHAZ00206_01_295J",
      "title": "El brazo, su sombra y el horizonte",
      "sol": 2023,
      "taken": "2026-10-29T13:07:42.945Z",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/fcam/FLF_2023_0846549745_302ECM_N0930000FHAZ00206_01_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2023_0846549745_302ECM_N0930000FHAZ00206_01_295J"
    },
    {
      "id": "FRF_2022_0846447347_237ECM_N0930000FHAZ02008_04_090J",
      "title": "Ladera de rocas",
      "sol": 2022,
      "taken": "2026-10-28T08:41:02.586Z",
      "instrument": "FRONT_HAZCAM_RIGHT_A",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/fcam/FRF_2022_0846447347_237ECM_N0930000FHAZ02008_04_090J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FRF_2022_0846447347_237ECM_N0930000FHAZ02008_04_090J"
    },
    {
      "id": "FRF_2017_0846002466_012ECM_N0920000FHAZ00206_01_295J",
      "title": "El brazo junto a unas rocas",
      "sol": 2017,
      "taken": "2026-10-23T05:06:18.013Z",
      "instrument": "FRONT_HAZCAM_RIGHT_A",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02017/ids/edr/browse/fcam/FRF_2017_0846002466_012ECM_N0920000FHAZ00206_01_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FRF_2017_0846002466_012ECM_N0920000FHAZ00206_01_295J"
    },
    {
      "id": "FLF_2022_0846447347_237ECM_N0930000FHAZ02008_02_090J",
      "title": "Rocas a un paso de las ruedas",
      "sol": 2022,
      "taken": "2026-10-28T08:41:02.463Z",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/fcam/FLF_2022_0846447347_237ECM_N0930000FHAZ02008_02_090J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2022_0846447347_237ECM_N0930000FHAZ02008_02_090J"
    }
  ],
  "watson": [
    {
      "id": "SIF_2011_0845479997_890EBY_N0920000SRLC01025_0000LMJ",
      "title": "El círculo que Percy pulió en una roca",
      "sol": 2011,
      "taken": "2026-10-17T03:58:51.492Z",
      "instrument": "SHERLOC_WATSON",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02011/ids/edr/browse/shrlc/SIF_2011_0845479997_890EBY_N0920000SRLC01025_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2011_0845479997_890EBY_N0920000SRLC01025_0000LMJ"
    },
    {
      "id": "SIF_2023_0846550026_515EBY_N0930000SRLC00630_0000LMJ",
      "title": "Roca con huecos, a centímetros",
      "sol": 2023,
      "taken": "2026-10-29T13:12:46.007Z",
      "instrument": "SHERLOC_WATSON",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/shrlc/SIF_2023_0846550026_515EBY_N0930000SRLC00630_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2023_0846550026_515EBY_N0930000SRLC00630_0000LMJ"
    },
    {
      "id": "SIF_2008_0845210330_597EBY_N0911496SRLC00648_0000LMJ",
      "title": "Granos rojizos de una roca",
      "sol": 2008,
      "taken": "2026-10-14T01:04:12.345Z",
      "instrument": "SHERLOC_WATSON",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02008/ids/edr/browse/shrlc/SIF_2008_0845210330_597EBY_N0911496SRLC00648_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2008_0845210330_597EBY_N0911496SRLC00648_0000LMJ"
    },
    {
      "id": "SIF_2014_0845734757_847EBY_N0920000SRLC00642_0000LMJ",
      "title": "Superficie anaranjada de una roca",
      "sol": 2014,
      "taken": "2026-10-20T02:44:51.526Z",
      "instrument": "SHERLOC_WATSON",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02014/ids/edr/browse/shrlc/SIF_2014_0845734757_847EBY_N0920000SRLC00642_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2014_0845734757_847EBY_N0920000SRLC00642_0000LMJ"
    },
    {
      "id": "SIF_2004_0844875424_238EBY_N0910970SRLC08065_0000LMJ",
      "title": "Guijarros sueltos",
      "sol": 2004,
      "taken": "2026-10-10T04:02:30.681Z",
      "instrument": "SHERLOC_WATSON",
      "src": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02004/ids/edr/browse/shrlc/SIF_2004_0844875424_238EBY_N0910970SRLC08065_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2004_0844875424_238EBY_N0910970SRLC08065_0000LMJ"
    }
  ]
};
