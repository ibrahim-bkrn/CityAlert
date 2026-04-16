const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// On utilise l'id 1 comme user par défaut — change si besoin
const USER_ID = 1;

const reports = [
  {
    title: 'Nid de poule rue Jean Jaurès',
    description: 'Nid de poule profond d\'environ 20cm, dangereux pour les vélos et scooters.',
    latitude: 48.7943,
    longitude: 2.3621,
    status: 'pending',
    report_count: 4,
  },
  {
    title: 'Lampadaire en panne avenue de Paris',
    description: 'Le lampadaire devant le numéro 42 est éteint depuis plus d\'une semaine.',
    latitude: 48.7958,
    longitude: 2.3672,
    status: 'approved',
    report_count: 2,
  },
  {
    title: 'Tag sur mur école primaire',
    description: 'Graffiti obscène sur le mur de l\'école Jules Ferry, côté entrée principale.',
    latitude: 48.7921,
    longitude: 2.3598,
    status: 'pending',
    report_count: 7,
  },
  {
    title: 'Poubelle débordante parc municipal',
    description: 'La poubelle near de l\'entrée du parc déborde depuis plusieurs jours, odeurs nauséabondes.',
    latitude: 48.7905,
    longitude: 2.3655,
    status: 'resolved',
    report_count: 3,
  },
  {
    title: 'Fissure trottoir rue Pasteur',
    description: 'Grande fissure sur le trottoir, risque de chute pour les personnes âgées et les poussettes.',
    latitude: 48.7934,
    longitude: 2.3700,
    status: 'approved',
    report_count: 5,
  },
  {
    title: 'Passage piéton effacé',
    description: 'Le marquage du passage piéton devant le marché est totalement effacé, très dangereux.',
    latitude: 48.7912,
    longitude: 2.3630,
    status: 'pending',
    report_count: 9,
  },
  {
    title: 'Banc public cassé square Lénine',
    description: 'Une latte du banc est cassée, bords tranchants, risque de blessure.',
    latitude: 48.7968,
    longitude: 2.3610,
    status: 'rejected',
    report_count: 1,
  },
  {
    title: 'Fuite d\'eau rue de la Paix',
    description: 'Une fuite d\'eau sous la chaussée forme une flaque permanente depuis 3 jours.',
    latitude: 48.7948,
    longitude: 2.3685,
    status: 'approved',
    report_count: 6,
  },
  {
    title: 'Feux tricolores en panne carrefour Victor Hugo',
    description: 'Les feux sont bloqués au rouge clignotant depuis hier matin, bouchons importants.',
    latitude: 48.7925,
    longitude: 2.3648,
    status: 'resolved',
    report_count: 12,
  },
  {
    title: 'Branche dangereuse boulevard Maxime Gorki',
    description: 'Une grosse branche d\'arbre pend au-dessus du trottoir, risque de chute par grand vent.',
    latitude: 48.7890,
    longitude: 2.3670,
    status: 'pending',
    report_count: 2,
  },
];

db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la DB :', err);
    process.exit(1);
  }
  console.log('Connecté à la base de données.\n');

  let done = 0;

  for (const r of reports) {
    db.query(
      'INSERT INTO reports (user_id, title, description, latitude, longitude, status, report_count, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [USER_ID, r.title, r.description, r.latitude, r.longitude, r.status, r.report_count, ''],
      (err, result) => {
        if (err) {
          console.error(`❌ Erreur pour "${r.title}" :`, err.message);
        } else {
          console.log(`✅ Inséré : "${r.title}" (id=${result.insertId})`);
        }
        done++;
        if (done === reports.length) {
          console.log('\nSeed terminé.');
          db.end();
        }
      }
    );
  }
});
