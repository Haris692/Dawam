// Distribution de la série « Au quotidien avec Dawam » (TikTok) : des profils variés, mêmes réglages d'une vidéo à l'autre.
// Chaque entrée est une config de Toon (lib/cartoon.js) ; on la complète par Object.assign({}, CAST.x, { legs: … }) selon la scène.
'use strict';
const CAST = {
  // Bilal, 19 ans, joueur — sweat à capuche, casque
  bilal: { skin: '#B9784F', hair: '#1E1410', beard: 'stubble', top: '#5C6B8A', bottom: '#2F3138', shoe: '#F4F2EC', collar: 'hoodie', headphones: '#2E2E36' },
  // Karim, 38 ans, père de famille — barbe, qamis le vendredi, chemise en semaine
  karim: { skin: '#A86B45', hair: '#1F1612', beard: true, top: '#D9D4CC', bottom: '#D9D4CC', collar: 'qamis', kufi: '#FFFFFF', sock: '#FFFFFF' },
  karimWork: { skin: '#A86B45', hair: '#1F1612', beard: true, top: '#8FB4DE', bottom: '#3E4A63', collar: 'shirt' },
  // Adam, 7 ans, fils de Karim
  adam: { skin: '#B07550', hair: '#1F1612', top: '#4FA3D1', bottom: '#2E4B78', collar: 'qamis', kufi: '#FFFFFF', sock: '#FFFFFF', tuft: true },
  // Sofiane, 26 ans, livreur — casquette, veste de survêtement
  sofiane: { skin: '#E0B08A', hair: '#2A1C14', beard: 'stubble', top: '#2F8F6B', bottom: '#2E3440', shoe: '#F4F2EC', collar: 'zip', stripe: '#FFFFFF', cap: '#2F3440', capLogo: '#F2C14E' },
  // Mehdi, 35 ans, père — t-shirt du samedi ; Lina (9 ans) et Youssef (5 ans)
  mehdi: { skin: '#D49A6A', hair: '#2B1D16', beard: true, top: '#C65D4A', bottom: '#3D4A6B', collar: 'tee' },
  lina: { head: 'hijab', hijab: '#F2C14E', under: '#FFFFFF', skin: '#D9A174', lashes: true, top: '#7DBE9A', bottom: '#4F7FA8' },
  youssef: { skin: '#D9A174', hair: '#2B1D16', top: '#F29E4C', bottom: '#3D4A6B', collar: 'tee' },
  // Ilyes, 21 ans, footballeur du dimanche — maillot, survêtement
  ilyes: { skin: '#8D5A3B', hair: '#14100D', top: '#E04848', bottom: '#22262E', shoe: '#F4F2EC', collar: 'tee' },
  ilyesJacket: { skin: '#8D5A3B', hair: '#14100D', top: '#22262E', bottom: '#22262E', shoe: '#F4F2EC', collar: 'zip', stripe: '#E04848' },
  // Hadj Ahmed, 72 ans, le grand-père — barbe blanche, lunettes, djellaba ; Naïm, 13 ans, son petit-fils
  papi: { skin: '#C99A74', hair: '#E8E4DC', beard: true, beardColor: '#F4F1EA', brow: '#D8D2C8', glasses: true, kufi: '#F4EFE6', kufiBand: '#B8936A', top: '#CBB89A', bottom: '#CBB89A', collar: 'qamis', shoe: '#8C5A3C' },
  naim: { skin: '#C08A62', hair: '#241812', top: '#4F86C6', bottom: '#2F3138', shoe: '#F4F2EC', collar: 'hoodie', neckphones: '#F4F2EC' },
  // Rayan, 22 ans, étudiant — lunettes, sweat kaki
  rayan: { skin: '#E6B48C', hair: '#3B2A20', beard: 'stubble', glasses: true, top: '#7A8B5A', bottom: '#3E3A36', collar: 'hoodie' },
  // Yanis, 24 ans — pyjama la nuit, qamis pour le Qiyam
  yanis: { skin: '#C48A5C', hair: '#20150F', beard: 'stubble', top: '#F4EFE6', bottom: '#F4EFE6', collar: 'qamis', sock: '#FFFFFF' },
  // Nassim, 30 ans, au bureau — chemise blanche ; Thomas, son collègue
  nassim: { skin: '#B47A55', hair: '#241812', beard: 'stubble', top: '#F7F5F0', bottom: '#2F3644', collar: 'shirt' },
  thomas: { skin: '#F3CFB0', hair: '#B5652E', glasses: true, top: '#6C8FB0', bottom: '#2F3644', collar: 'tee' },
};
