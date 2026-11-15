/*
 * PROTOTYPE (#115), throwaway: the landing copy as a stub object, in Spanish and English, so the
 * "EN copy" state can swap strings at runtime and we can check line lengths. Real copy goes through
 * Angular i18n when the winning variant is built.
 */

export interface Item {
  readonly title: string;
  readonly body: string;
}

export interface LandingCopy {
  readonly tagline: string;
  readonly lead: string;
  readonly createAccount: string;
  readonly signIn: string;
  readonly apiDown: string;
  readonly retry: string;
  readonly accountDeleted: string;
  readonly freeChips: readonly string[];

  readonly howTitle: string;
  readonly steps: readonly Item[];

  readonly featuresTitle: string;
  readonly invite: Item;
  readonly exclusions: Item;
  readonly wishlist: Item;
  readonly reveal: Item;
  readonly free: Item;

  readonly mailboxTitle: string;
  readonly mailboxBody: string;
  readonly bubbleMine: string;
  readonly bubbleTheirs: string;
  readonly srMe: string;
  readonly srThem: string;
  readonly guarantee: string;

  readonly dontListTitle: string;
  readonly dontListItems: readonly string[];
  readonly wishes: readonly string[];

  readonly exclusionNames: readonly [string, string];
  readonly exclusionCaption: string;

  readonly revealLead: string;
  readonly revealName: string;
  readonly revealWink: string;
  readonly openEnvelope: string;
  readonly closeEnvelope: string;

  readonly closingTitle: string;
  readonly closingBody: string;

  /** Option C: the story of a Group, seven nodes. */
  readonly story: readonly Item[];
  readonly groupName: string;
  readonly groupChips: readonly string[];

  readonly ogTitle: string;
  readonly ogDescription: string;
}

export const ES: LandingCopy = {
  tagline: 'Tu amigo invisible, sin papelitos.',
  lead: 'Organiza el intercambio de regalos con tu familia, tus amigos o tu oficina. Para cumpleaños, despedidas, fin de curso… o porque sí.',
  createAccount: 'Crear cuenta',
  signIn: 'Iniciar sesión',
  apiDown: 'No podemos conectar con el servidor',
  retry: 'Reintentar',
  accountDeleted: 'Tu cuenta se ha borrado. Te hemos enviado un email para confirmarlo.',
  freeChips: ['Gratis', 'Sin anuncios', 'En el móvil'],

  howTitle: 'Cómo funciona',
  steps: [
    { title: 'Crea un grupo', body: 'Ponle nombre, fecha y presupuesto.' },
    { title: 'Comparte el enlace', body: 'Cada uno entra con su cuenta, sin que tú hagas nada.' },
    { title: 'Haz el sorteo', body: 'Lanzas el sorteo y cada uno abre su sobre.' },
  ],

  featuresTitle: 'Lo que lo hace distinto',
  invite: {
    title: 'Un enlace y listo',
    body: 'No creas cuentas por nadie: cada uno se une con el enlace de invitación.',
  },
  exclusions: {
    title: 'Parejas que no se tocan',
    body: 'Las parejas o quienes viven juntos nunca se sortean entre sí.',
  },
  wishlist: {
    title: 'Sabes qué regalar (y qué no)',
    body: 'Cada uno apunta sus deseos, sus preferencias y su lista de «Nada de…».',
  },
  reveal: {
    title: 'Un sobre que abres tú',
    body: 'Tu persona secreta aparece al abrir el sobre, y solo la ves tú.',
  },
  free: {
    title: 'Gratis y sin anuncios',
    body: 'Sin letra pequeña ni sorpresas, salvo la del regalo.',
  },

  mailboxTitle: 'Pregunta sin delatarte',
  mailboxBody: 'Escribe a tu persona secreta desde un buzón anónimo y acierta con la talla.',
  bubbleMine: '¿Talla M o L?',
  bubbleTheirs: '¡M! 😊',
  srMe: 'Tú:',
  srThem: 'Lucía:',
  guarantee: 'Quien recibe el regalo nunca puede saber quién se lo hace.',

  dontListTitle: 'Nada de…',
  dontListItems: ['velas', 'chocolate'],
  wishes: ['Un libro de cocina', 'Calcetines divertidos', 'Plantas'],

  exclusionNames: ['Ana', 'Luis'],
  exclusionCaption: 'Ana y Luis nunca se tocan entre ellos.',

  revealLead: 'Te toca regalar a',
  revealName: 'Lucía',
  revealWink: '¡Ya tienes a tu persona secreta! 🤫',
  openEnvelope: 'Abrir el sobre',
  closeEnvelope: 'Volver a cerrarlo',

  closingTitle: '¿Organizamos el vuestro?',
  closingBody: 'Crear el grupo te lleva un minuto.',

  story: [
    { title: 'Creas el grupo', body: 'Ponle nombre, fecha del intercambio y presupuesto.' },
    {
      title: 'Compartes el enlace',
      body: 'Nadie tiene que crear nada por otro: cada uno entra con el enlace.',
    },
    {
      title: 'Pones las exclusiones',
      body: 'Las parejas o quienes viven juntos no se sortean entre sí.',
    },
    { title: 'Cada uno escribe su lista', body: 'Deseos, preferencias y lo que no quiere ni ver.' },
    { title: 'Sorteo y sobre', body: 'Lanzas el sorteo y cada uno abre su sobre, solo para él.' },
    {
      title: 'Preguntas sin delatarte',
      body: 'Escribe a tu persona secreta desde el buzón anónimo.',
    },
    { title: 'El día del intercambio 🎁', body: 'Solo queda abrir los regalos. ¿Empezamos?' },
  ],
  groupName: 'Cumpleaños de Lucía',
  groupChips: ['12 de marzo', '25 €', '8 personas'],

  ogTitle: 'SecretMatch — Tu amigo invisible, sin papelitos',
  ogDescription:
    'Organiza el intercambio de regalos con un enlace, listas de deseos y un sorteo anónimo.',
};

export const EN: LandingCopy = {
  tagline: 'Your Secret Santa, no slips of paper.',
  lead: 'Run a gift exchange with your family, your friends or your office. For birthdays, farewells, the end of term… or just because.',
  createAccount: 'Create account',
  signIn: 'Sign in',
  apiDown: "We can't reach the server",
  retry: 'Try again',
  accountDeleted: "Your account has been deleted. We've sent you an email to confirm it.",
  freeChips: ['Free', 'No ads', 'On your phone'],

  howTitle: 'How it works',
  steps: [
    { title: 'Create a Group', body: 'Give it a name, a date and a budget.' },
    { title: 'Share the link', body: 'Everyone joins with their own account; you set up nothing.' },
    { title: 'Run the Draw', body: 'You run the Draw and everyone opens their envelope.' },
  ],

  featuresTitle: 'What makes it different',
  invite: {
    title: 'One link, done',
    body: "You don't create accounts for anyone: everyone joins with the Invite Link.",
  },
  exclusions: {
    title: "Couples won't draw each other",
    body: 'Couples or people who live together are never drawn to each other.',
  },
  wishlist: {
    title: 'Know what to buy (and what not to)',
    body: 'Everyone writes their Wishes, their Preferences and their Don’t List.',
  },
  reveal: {
    title: 'An envelope you open',
    body: 'Your secret person appears when you open the envelope, and only you see it.',
  },
  free: { title: 'Free, no ads', body: 'No small print and no surprises, except the gift.' },

  mailboxTitle: 'Ask without giving yourself away',
  mailboxBody: 'Write to your secret person from an anonymous Mailbox and get the size right.',
  bubbleMine: 'Size M or L?',
  bubbleTheirs: 'M! 😊',
  srMe: 'You:',
  srThem: 'Lucía:',
  guarantee: 'Whoever receives the gift can never find out who gave it.',

  dontListTitle: 'Please, no…',
  dontListItems: ['candles', 'chocolate'],
  wishes: ['A cookbook', 'Fun socks', 'Plants'],

  exclusionNames: ['Ana', 'Luis'],
  exclusionCaption: 'Ana and Luis are never drawn to each other.',

  revealLead: "You're giving a gift to",
  revealName: 'Lucía',
  revealWink: "You've got your secret person! 🤫",
  openEnvelope: 'Open the envelope',
  closeEnvelope: 'Close it again',

  closingTitle: 'Shall we set up yours?',
  closingBody: 'Creating the Group takes a minute.',

  story: [
    { title: 'You create the Group', body: 'Give it a name, an exchange date and a budget.' },
    {
      title: 'You share the link',
      body: 'Nobody sets anything up for anyone else: everyone joins with the link.',
    },
    {
      title: 'You set the Exclusions',
      body: 'Couples or people who live together are never drawn to each other.',
    },
    {
      title: 'Everyone writes their list',
      body: "Wishes, Preferences and what they don't want to see.",
    },
    { title: 'Draw and envelope', body: 'You run the Draw and everyone opens their own envelope.' },
    {
      title: 'Ask without giving yourself away',
      body: 'Write to your secret person from the anonymous Mailbox.',
    },
    { title: 'Exchange day 🎁', body: 'All that’s left is opening the gifts. Shall we start?' },
  ],
  groupName: "Lucía's birthday",
  groupChips: ['12 March', '€25', '8 people'],

  ogTitle: 'SecretMatch — Your Secret Santa, no slips of paper',
  ogDescription: 'Run a gift exchange with one link, Wishlists and an anonymous Draw.',
};
