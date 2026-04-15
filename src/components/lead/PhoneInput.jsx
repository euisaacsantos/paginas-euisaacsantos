import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

const COUNTRIES = [
  { code: 'BR', ddi: '55', flag: '🇧🇷', name: 'Brasil', maxDigits: 11 },
  { code: 'AF', ddi: '93', flag: '🇦🇫', name: 'Afeganistão', maxDigits: 9 },
  { code: 'ZA', ddi: '27', flag: '🇿🇦', name: 'África do Sul', maxDigits: 9 },
  { code: 'AL', ddi: '355', flag: '🇦🇱', name: 'Albânia', maxDigits: 9 },
  { code: 'DE', ddi: '49', flag: '🇩🇪', name: 'Alemanha', maxDigits: 11 },
  { code: 'AD', ddi: '376', flag: '🇦🇩', name: 'Andorra', maxDigits: 6 },
  { code: 'AO', ddi: '244', flag: '🇦🇴', name: 'Angola', maxDigits: 9 },
  { code: 'AG', ddi: '1268', flag: '🇦🇬', name: 'Antígua e Barbuda', maxDigits: 7 },
  { code: 'SA', ddi: '966', flag: '🇸🇦', name: 'Arábia Saudita', maxDigits: 9 },
  { code: 'DZ', ddi: '213', flag: '🇩🇿', name: 'Argélia', maxDigits: 9 },
  { code: 'AR', ddi: '54', flag: '🇦🇷', name: 'Argentina', maxDigits: 10 },
  { code: 'AM', ddi: '374', flag: '🇦🇲', name: 'Armênia', maxDigits: 8 },
  { code: 'AU', ddi: '61', flag: '🇦🇺', name: 'Austrália', maxDigits: 9 },
  { code: 'AT', ddi: '43', flag: '🇦🇹', name: 'Áustria', maxDigits: 10 },
  { code: 'AZ', ddi: '994', flag: '🇦🇿', name: 'Azerbaijão', maxDigits: 9 },
  { code: 'BS', ddi: '1242', flag: '🇧🇸', name: 'Bahamas', maxDigits: 7 },
  { code: 'BD', ddi: '880', flag: '🇧🇩', name: 'Bangladesh', maxDigits: 10 },
  { code: 'BB', ddi: '1246', flag: '🇧🇧', name: 'Barbados', maxDigits: 7 },
  { code: 'BH', ddi: '973', flag: '🇧🇭', name: 'Bahrein', maxDigits: 8 },
  { code: 'BE', ddi: '32', flag: '🇧🇪', name: 'Bélgica', maxDigits: 9 },
  { code: 'BZ', ddi: '501', flag: '🇧🇿', name: 'Belize', maxDigits: 7 },
  { code: 'BJ', ddi: '229', flag: '🇧🇯', name: 'Benin', maxDigits: 8 },
  { code: 'BY', ddi: '375', flag: '🇧🇾', name: 'Bielorrússia', maxDigits: 10 },
  { code: 'BO', ddi: '591', flag: '🇧🇴', name: 'Bolívia', maxDigits: 8 },
  { code: 'BA', ddi: '387', flag: '🇧🇦', name: 'Bósnia e Herzegovina', maxDigits: 8 },
  { code: 'BW', ddi: '267', flag: '🇧🇼', name: 'Botsuana', maxDigits: 8 },
  { code: 'BN', ddi: '673', flag: '🇧🇳', name: 'Brunei', maxDigits: 7 },
  { code: 'BG', ddi: '359', flag: '🇧🇬', name: 'Bulgária', maxDigits: 9 },
  { code: 'BF', ddi: '226', flag: '🇧🇫', name: 'Burkina Faso', maxDigits: 8 },
  { code: 'BI', ddi: '257', flag: '🇧🇮', name: 'Burundi', maxDigits: 8 },
  { code: 'BT', ddi: '975', flag: '🇧🇹', name: 'Butão', maxDigits: 8 },
  { code: 'CV', ddi: '238', flag: '🇨🇻', name: 'Cabo Verde', maxDigits: 7 },
  { code: 'CM', ddi: '237', flag: '🇨🇲', name: 'Camarões', maxDigits: 9 },
  { code: 'KH', ddi: '855', flag: '🇰🇭', name: 'Camboja', maxDigits: 9 },
  { code: 'CA', ddi: '1', flag: '🇨🇦', name: 'Canadá', maxDigits: 10 },
  { code: 'QA', ddi: '974', flag: '🇶🇦', name: 'Catar', maxDigits: 8 },
  { code: 'KZ', ddi: '7', flag: '🇰🇿', name: 'Cazaquistão', maxDigits: 10 },
  { code: 'TD', ddi: '235', flag: '🇹🇩', name: 'Chade', maxDigits: 8 },
  { code: 'CL', ddi: '56', flag: '🇨🇱', name: 'Chile', maxDigits: 9 },
  { code: 'CN', ddi: '86', flag: '🇨🇳', name: 'China', maxDigits: 11 },
  { code: 'CY', ddi: '357', flag: '🇨🇾', name: 'Chipre', maxDigits: 8 },
  { code: 'CO', ddi: '57', flag: '🇨🇴', name: 'Colômbia', maxDigits: 10 },
  { code: 'KM', ddi: '269', flag: '🇰🇲', name: 'Comores', maxDigits: 7 },
  { code: 'CG', ddi: '242', flag: '🇨🇬', name: 'Congo', maxDigits: 9 },
  { code: 'CD', ddi: '243', flag: '🇨🇩', name: 'Congo (RDC)', maxDigits: 9 },
  { code: 'KR', ddi: '82', flag: '🇰🇷', name: 'Coreia do Sul', maxDigits: 10 },
  { code: 'KP', ddi: '850', flag: '🇰🇵', name: 'Coreia do Norte', maxDigits: 10 },
  { code: 'CI', ddi: '225', flag: '🇨🇮', name: 'Costa do Marfim', maxDigits: 10 },
  { code: 'CR', ddi: '506', flag: '🇨🇷', name: 'Costa Rica', maxDigits: 8 },
  { code: 'HR', ddi: '385', flag: '🇭🇷', name: 'Croácia', maxDigits: 9 },
  { code: 'CU', ddi: '53', flag: '🇨🇺', name: 'Cuba', maxDigits: 8 },
  { code: 'DK', ddi: '45', flag: '🇩🇰', name: 'Dinamarca', maxDigits: 8 },
  { code: 'DJ', ddi: '253', flag: '🇩🇯', name: 'Djibuti', maxDigits: 8 },
  { code: 'DM', ddi: '1767', flag: '🇩🇲', name: 'Dominica', maxDigits: 7 },
  { code: 'EG', ddi: '20', flag: '🇪🇬', name: 'Egito', maxDigits: 10 },
  { code: 'SV', ddi: '503', flag: '🇸🇻', name: 'El Salvador', maxDigits: 8 },
  { code: 'AE', ddi: '971', flag: '🇦🇪', name: 'Emirados Árabes', maxDigits: 9 },
  { code: 'EC', ddi: '593', flag: '🇪🇨', name: 'Equador', maxDigits: 9 },
  { code: 'ER', ddi: '291', flag: '🇪🇷', name: 'Eritreia', maxDigits: 7 },
  { code: 'SK', ddi: '421', flag: '🇸🇰', name: 'Eslováquia', maxDigits: 9 },
  { code: 'SI', ddi: '386', flag: '🇸🇮', name: 'Eslovênia', maxDigits: 8 },
  { code: 'ES', ddi: '34', flag: '🇪🇸', name: 'Espanha', maxDigits: 9 },
  { code: 'US', ddi: '1', flag: '🇺🇸', name: 'Estados Unidos', maxDigits: 10 },
  { code: 'EE', ddi: '372', flag: '🇪🇪', name: 'Estônia', maxDigits: 8 },
  { code: 'SZ', ddi: '268', flag: '🇸🇿', name: 'Essuatini', maxDigits: 8 },
  { code: 'ET', ddi: '251', flag: '🇪🇹', name: 'Etiópia', maxDigits: 9 },
  { code: 'FJ', ddi: '679', flag: '🇫🇯', name: 'Fiji', maxDigits: 7 },
  { code: 'PH', ddi: '63', flag: '🇵🇭', name: 'Filipinas', maxDigits: 10 },
  { code: 'FI', ddi: '358', flag: '🇫🇮', name: 'Finlândia', maxDigits: 10 },
  { code: 'FR', ddi: '33', flag: '🇫🇷', name: 'França', maxDigits: 10 },
  { code: 'GA', ddi: '241', flag: '🇬🇦', name: 'Gabão', maxDigits: 8 },
  { code: 'GM', ddi: '220', flag: '🇬🇲', name: 'Gâmbia', maxDigits: 7 },
  { code: 'GH', ddi: '233', flag: '🇬🇭', name: 'Gana', maxDigits: 9 },
  { code: 'GE', ddi: '995', flag: '🇬🇪', name: 'Geórgia', maxDigits: 9 },
  { code: 'GD', ddi: '1473', flag: '🇬🇩', name: 'Granada', maxDigits: 7 },
  { code: 'GR', ddi: '30', flag: '🇬🇷', name: 'Grécia', maxDigits: 10 },
  { code: 'GT', ddi: '502', flag: '🇬🇹', name: 'Guatemala', maxDigits: 8 },
  { code: 'GY', ddi: '592', flag: '🇬🇾', name: 'Guiana', maxDigits: 7 },
  { code: 'GF', ddi: '594', flag: '🇬🇫', name: 'Guiana Francesa', maxDigits: 9 },
  { code: 'GN', ddi: '224', flag: '🇬🇳', name: 'Guiné', maxDigits: 9 },
  { code: 'GQ', ddi: '240', flag: '🇬🇶', name: 'Guiné Equatorial', maxDigits: 9 },
  { code: 'GW', ddi: '245', flag: '🇬🇼', name: 'Guiné-Bissau', maxDigits: 7 },
  { code: 'HT', ddi: '509', flag: '🇭🇹', name: 'Haiti', maxDigits: 8 },
  { code: 'HN', ddi: '504', flag: '🇭🇳', name: 'Honduras', maxDigits: 8 },
  { code: 'HK', ddi: '852', flag: '🇭🇰', name: 'Hong Kong', maxDigits: 8 },
  { code: 'HU', ddi: '36', flag: '🇭🇺', name: 'Hungria', maxDigits: 9 },
  { code: 'YE', ddi: '967', flag: '🇾🇪', name: 'Iêmen', maxDigits: 9 },
  { code: 'IN', ddi: '91', flag: '🇮🇳', name: 'Índia', maxDigits: 10 },
  { code: 'ID', ddi: '62', flag: '🇮🇩', name: 'Indonésia', maxDigits: 11 },
  { code: 'IQ', ddi: '964', flag: '🇮🇶', name: 'Iraque', maxDigits: 10 },
  { code: 'IR', ddi: '98', flag: '🇮🇷', name: 'Irã', maxDigits: 10 },
  { code: 'IE', ddi: '353', flag: '🇮🇪', name: 'Irlanda', maxDigits: 9 },
  { code: 'IS', ddi: '354', flag: '🇮🇸', name: 'Islândia', maxDigits: 7 },
  { code: 'IL', ddi: '972', flag: '🇮🇱', name: 'Israel', maxDigits: 9 },
  { code: 'IT', ddi: '39', flag: '🇮🇹', name: 'Itália', maxDigits: 10 },
  { code: 'JM', ddi: '1876', flag: '🇯🇲', name: 'Jamaica', maxDigits: 7 },
  { code: 'JP', ddi: '81', flag: '🇯🇵', name: 'Japão', maxDigits: 10 },
  { code: 'JO', ddi: '962', flag: '🇯🇴', name: 'Jordânia', maxDigits: 9 },
  { code: 'KW', ddi: '965', flag: '🇰🇼', name: 'Kuwait', maxDigits: 8 },
  { code: 'LA', ddi: '856', flag: '🇱🇦', name: 'Laos', maxDigits: 10 },
  { code: 'LS', ddi: '266', flag: '🇱🇸', name: 'Lesoto', maxDigits: 8 },
  { code: 'LV', ddi: '371', flag: '🇱🇻', name: 'Letônia', maxDigits: 8 },
  { code: 'LB', ddi: '961', flag: '🇱🇧', name: 'Líbano', maxDigits: 8 },
  { code: 'LR', ddi: '231', flag: '🇱🇷', name: 'Libéria', maxDigits: 9 },
  { code: 'LY', ddi: '218', flag: '🇱🇾', name: 'Líbia', maxDigits: 9 },
  { code: 'LI', ddi: '423', flag: '🇱🇮', name: 'Liechtenstein', maxDigits: 7 },
  { code: 'LT', ddi: '370', flag: '🇱🇹', name: 'Lituânia', maxDigits: 8 },
  { code: 'LU', ddi: '352', flag: '🇱🇺', name: 'Luxemburgo', maxDigits: 9 },
  { code: 'MO', ddi: '853', flag: '🇲🇴', name: 'Macau', maxDigits: 8 },
  { code: 'MK', ddi: '389', flag: '🇲🇰', name: 'Macedônia do Norte', maxDigits: 8 },
  { code: 'MG', ddi: '261', flag: '🇲🇬', name: 'Madagascar', maxDigits: 9 },
  { code: 'MY', ddi: '60', flag: '🇲🇾', name: 'Malásia', maxDigits: 10 },
  { code: 'MW', ddi: '265', flag: '🇲🇼', name: 'Malawi', maxDigits: 9 },
  { code: 'MV', ddi: '960', flag: '🇲🇻', name: 'Maldivas', maxDigits: 7 },
  { code: 'ML', ddi: '223', flag: '🇲🇱', name: 'Mali', maxDigits: 8 },
  { code: 'MT', ddi: '356', flag: '🇲🇹', name: 'Malta', maxDigits: 8 },
  { code: 'MA', ddi: '212', flag: '🇲🇦', name: 'Marrocos', maxDigits: 9 },
  { code: 'MU', ddi: '230', flag: '🇲🇺', name: 'Maurício', maxDigits: 8 },
  { code: 'MR', ddi: '222', flag: '🇲🇷', name: 'Mauritânia', maxDigits: 8 },
  { code: 'MX', ddi: '52', flag: '🇲🇽', name: 'México', maxDigits: 10 },
  { code: 'FM', ddi: '691', flag: '🇫🇲', name: 'Micronésia', maxDigits: 7 },
  { code: 'MM', ddi: '95', flag: '🇲🇲', name: 'Mianmar', maxDigits: 10 },
  { code: 'MD', ddi: '373', flag: '🇲🇩', name: 'Moldávia', maxDigits: 8 },
  { code: 'MC', ddi: '377', flag: '🇲🇨', name: 'Mônaco', maxDigits: 8 },
  { code: 'MN', ddi: '976', flag: '🇲🇳', name: 'Mongólia', maxDigits: 8 },
  { code: 'ME', ddi: '382', flag: '🇲🇪', name: 'Montenegro', maxDigits: 8 },
  { code: 'MZ', ddi: '258', flag: '🇲🇿', name: 'Moçambique', maxDigits: 9 },
  { code: 'NA', ddi: '264', flag: '🇳🇦', name: 'Namíbia', maxDigits: 9 },
  { code: 'NR', ddi: '674', flag: '🇳🇷', name: 'Nauru', maxDigits: 7 },
  { code: 'NP', ddi: '977', flag: '🇳🇵', name: 'Nepal', maxDigits: 10 },
  { code: 'NI', ddi: '505', flag: '🇳🇮', name: 'Nicarágua', maxDigits: 8 },
  { code: 'NE', ddi: '227', flag: '🇳🇪', name: 'Níger', maxDigits: 8 },
  { code: 'NG', ddi: '234', flag: '🇳🇬', name: 'Nigéria', maxDigits: 10 },
  { code: 'NO', ddi: '47', flag: '🇳🇴', name: 'Noruega', maxDigits: 8 },
  { code: 'NZ', ddi: '64', flag: '🇳🇿', name: 'Nova Zelândia', maxDigits: 9 },
  { code: 'OM', ddi: '968', flag: '🇴🇲', name: 'Omã', maxDigits: 8 },
  { code: 'NL', ddi: '31', flag: '🇳🇱', name: 'Países Baixos', maxDigits: 9 },
  { code: 'PW', ddi: '680', flag: '🇵🇼', name: 'Palau', maxDigits: 7 },
  { code: 'PS', ddi: '970', flag: '🇵🇸', name: 'Palestina', maxDigits: 9 },
  { code: 'PK', ddi: '92', flag: '🇵🇰', name: 'Paquistão', maxDigits: 10 },
  { code: 'PA', ddi: '507', flag: '🇵🇦', name: 'Panamá', maxDigits: 8 },
  { code: 'PG', ddi: '675', flag: '🇵🇬', name: 'Papua Nova Guiné', maxDigits: 8 },
  { code: 'PY', ddi: '595', flag: '🇵🇾', name: 'Paraguai', maxDigits: 9 },
  { code: 'PE', ddi: '51', flag: '🇵🇪', name: 'Peru', maxDigits: 9 },
  { code: 'PL', ddi: '48', flag: '🇵🇱', name: 'Polônia', maxDigits: 9 },
  { code: 'PR', ddi: '1787', flag: '🇵🇷', name: 'Porto Rico', maxDigits: 7 },
  { code: 'PT', ddi: '351', flag: '🇵🇹', name: 'Portugal', maxDigits: 9 },
  { code: 'KE', ddi: '254', flag: '🇰🇪', name: 'Quênia', maxDigits: 9 },
  { code: 'KG', ddi: '996', flag: '🇰🇬', name: 'Quirguistão', maxDigits: 9 },
  { code: 'GB', ddi: '44', flag: '🇬🇧', name: 'Reino Unido', maxDigits: 10 },
  { code: 'CF', ddi: '236', flag: '🇨🇫', name: 'Rep. Centro-Africana', maxDigits: 8 },
  { code: 'DO', ddi: '1809', flag: '🇩🇴', name: 'Rep. Dominicana', maxDigits: 7 },
  { code: 'CZ', ddi: '420', flag: '🇨🇿', name: 'República Tcheca', maxDigits: 9 },
  { code: 'RO', ddi: '40', flag: '🇷🇴', name: 'Romênia', maxDigits: 9 },
  { code: 'RW', ddi: '250', flag: '🇷🇼', name: 'Ruanda', maxDigits: 9 },
  { code: 'RU', ddi: '7', flag: '🇷🇺', name: 'Rússia', maxDigits: 10 },
  { code: 'WS', ddi: '685', flag: '🇼🇸', name: 'Samoa', maxDigits: 7 },
  { code: 'LC', ddi: '1758', flag: '🇱🇨', name: 'Santa Lúcia', maxDigits: 7 },
  { code: 'KN', ddi: '1869', flag: '🇰🇳', name: 'São Cristóvão e Névis', maxDigits: 7 },
  { code: 'SM', ddi: '378', flag: '🇸🇲', name: 'San Marino', maxDigits: 10 },
  { code: 'ST', ddi: '239', flag: '🇸🇹', name: 'São Tomé e Príncipe', maxDigits: 7 },
  { code: 'VC', ddi: '1784', flag: '🇻🇨', name: 'São Vicente e Granadinas', maxDigits: 7 },
  { code: 'SN', ddi: '221', flag: '🇸🇳', name: 'Senegal', maxDigits: 9 },
  { code: 'SL', ddi: '232', flag: '🇸🇱', name: 'Serra Leoa', maxDigits: 8 },
  { code: 'RS', ddi: '381', flag: '🇷🇸', name: 'Sérvia', maxDigits: 9 },
  { code: 'SC', ddi: '248', flag: '🇸🇨', name: 'Seychelles', maxDigits: 7 },
  { code: 'SG', ddi: '65', flag: '🇸🇬', name: 'Singapura', maxDigits: 8 },
  { code: 'SY', ddi: '963', flag: '🇸🇾', name: 'Síria', maxDigits: 9 },
  { code: 'SO', ddi: '252', flag: '🇸🇴', name: 'Somália', maxDigits: 8 },
  { code: 'LK', ddi: '94', flag: '🇱🇰', name: 'Sri Lanka', maxDigits: 9 },
  { code: 'SD', ddi: '249', flag: '🇸🇩', name: 'Sudão', maxDigits: 9 },
  { code: 'SS', ddi: '211', flag: '🇸🇸', name: 'Sudão do Sul', maxDigits: 9 },
  { code: 'SE', ddi: '46', flag: '🇸🇪', name: 'Suécia', maxDigits: 9 },
  { code: 'CH', ddi: '41', flag: '🇨🇭', name: 'Suíça', maxDigits: 9 },
  { code: 'SR', ddi: '597', flag: '🇸🇷', name: 'Suriname', maxDigits: 7 },
  { code: 'TH', ddi: '66', flag: '🇹🇭', name: 'Tailândia', maxDigits: 9 },
  { code: 'TW', ddi: '886', flag: '🇹🇼', name: 'Taiwan', maxDigits: 9 },
  { code: 'TZ', ddi: '255', flag: '🇹🇿', name: 'Tanzânia', maxDigits: 9 },
  { code: 'TJ', ddi: '992', flag: '🇹🇯', name: 'Tadjiquistão', maxDigits: 9 },
  { code: 'TL', ddi: '670', flag: '🇹🇱', name: 'Timor-Leste', maxDigits: 8 },
  { code: 'TG', ddi: '228', flag: '🇹🇬', name: 'Togo', maxDigits: 8 },
  { code: 'TO', ddi: '676', flag: '🇹🇴', name: 'Tonga', maxDigits: 7 },
  { code: 'TT', ddi: '1868', flag: '🇹🇹', name: 'Trinidad e Tobago', maxDigits: 7 },
  { code: 'TN', ddi: '216', flag: '🇹🇳', name: 'Tunísia', maxDigits: 8 },
  { code: 'TM', ddi: '993', flag: '🇹🇲', name: 'Turcomenistão', maxDigits: 8 },
  { code: 'TR', ddi: '90', flag: '🇹🇷', name: 'Turquia', maxDigits: 10 },
  { code: 'TV', ddi: '688', flag: '🇹🇻', name: 'Tuvalu', maxDigits: 6 },
  { code: 'UA', ddi: '380', flag: '🇺🇦', name: 'Ucrânia', maxDigits: 9 },
  { code: 'UG', ddi: '256', flag: '🇺🇬', name: 'Uganda', maxDigits: 9 },
  { code: 'UY', ddi: '598', flag: '🇺🇾', name: 'Uruguai', maxDigits: 8 },
  { code: 'UZ', ddi: '998', flag: '🇺🇿', name: 'Uzbequistão', maxDigits: 9 },
  { code: 'VU', ddi: '678', flag: '🇻🇺', name: 'Vanuatu', maxDigits: 7 },
  { code: 'VA', ddi: '379', flag: '🇻🇦', name: 'Vaticano', maxDigits: 10 },
  { code: 'VE', ddi: '58', flag: '🇻🇪', name: 'Venezuela', maxDigits: 10 },
  { code: 'VN', ddi: '84', flag: '🇻🇳', name: 'Vietnã', maxDigits: 10 },
  { code: 'ZM', ddi: '260', flag: '🇿🇲', name: 'Zâmbia', maxDigits: 9 },
  { code: 'ZW', ddi: '263', flag: '🇿🇼', name: 'Zimbábue', maxDigits: 9 },
]

function formatBR(digits) {
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function PhoneInput({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [digits, setDigits] = useState('')
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)

  // Parse initial value
  useEffect(() => {
    if (value && value.startsWith('+')) {
      const raw = value.replace(/\D/g, '')
      const sorted = [...COUNTRIES].sort((a, b) => b.ddi.length - a.ddi.length)
      const match = sorted.find((c) => raw.startsWith(c.ddi))
      if (match) {
        setSelectedCountry(match)
        setDigits(raw.slice(match.ddi.length))
      }
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const filteredCountries = useMemo(() => {
    if (!search) return COUNTRIES
    const q = normalize(search)
    return COUNTRIES.filter((c) =>
      normalize(c.name).includes(q) || c.code.toLowerCase().includes(q) || c.ddi.includes(q)
    )
  }, [search])

  const handleDigitsChange = useCallback((e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxDigits)
    setDigits(raw)
    onChange(`+${selectedCountry.ddi}${raw}`)
  }, [selectedCountry, onChange])

  const handleCountrySelect = useCallback((country) => {
    setSelectedCountry(country)
    setOpen(false)
    setSearch('')
    setDigits('')
    onChange(`+${country.ddi}`)
  }, [onChange])

  const displayValue = selectedCountry.code === 'BR' ? formatBR(digits) : digits

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="lead-input flex items-center gap-0 !p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-3.5 border-r border-bgt hover:bg-white/5 transition-colors shrink-0"
        >
          <span className="text-lg leading-none">{selectedCountry.flag}</span>
          <span className="text-xs text-zinc-400">+{selectedCountry.ddi}</span>
          <svg className={`w-3 h-3 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <input
          type="tel"
          value={displayValue}
          onChange={handleDigitsChange}
          placeholder={selectedCountry.code === 'BR' ? '(00) 00000-0000' : 'Número'}
          required
          className="flex-1 px-3 py-3.5 outline-none bg-transparent text-white placeholder:text-zinc-500 text-[15px]"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-bgs border border-bgt rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-bgt">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país ou DDI..."
              className="w-full px-3 py-2 rounded-lg bg-bgp border border-bgt text-sm text-white placeholder:text-zinc-500 outline-none focus:border-orange-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-500 text-center">Nenhum país encontrado</p>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={`${country.code}-${country.ddi}`}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors text-sm ${
                    country.code === selectedCountry.code && country.ddi === selectedCountry.ddi
                      ? 'bg-orange-500/10 font-medium text-orange-400'
                      : 'text-zinc-200'
                  }`}
                >
                  <span className="text-lg leading-none">{country.flag}</span>
                  <span className="truncate">{country.name}</span>
                  <span className="text-zinc-500 text-xs ml-auto shrink-0">+{country.ddi}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function getPhoneDigits(fullPhone) {
  return (fullPhone || '').replace(/\D/g, '')
}

export function getMinDigits(fullPhone) {
  const raw = (fullPhone || '').replace(/\D/g, '')
  const sorted = [...COUNTRIES].sort((a, b) => b.ddi.length - a.ddi.length)
  const country = sorted.find((c) => raw.startsWith(c.ddi))
  return country ? country.ddi.length + 7 : 10
}
