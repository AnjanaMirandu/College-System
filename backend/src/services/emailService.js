const nodemailer = require('nodemailer');

class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(cause?.message ? `${message} ${cause.message}` : message);
    this.name = 'EmailDeliveryError';
    this.cause = cause;
  }
}

const getMailConfig = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  const host = process.env.SMTP_HOST || (user ? 'smtp.gmail.com' : '');
  const port = Number(process.env.SMTP_PORT || 465);
  const isGmailSmtp = /(^|\.)gmail\.com$/i.test(host) || String(user || '').toLowerCase().endsWith('@gmail.com');
  const pass = rawPass && isGmailSmtp ? String(rawPass).replace(/\s+/g, '') : rawPass;

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE
      ? String(process.env.SMTP_SECURE).toLowerCase() !== 'false'
      : port === 465,
    user,
    pass,
    from: process.env.MAIL_FROM || process.env.SMTP_FROM || user,
  };
};

const assertMailConfig = (config = getMailConfig()) => {
  if (!config.host || !config.user || !config.pass || !config.from) {
    throw new Error('Email is not configured. Set SMTP_USER and SMTP_PASS or GMAIL_USER and GMAIL_APP_PASSWORD.');
  }
};

const createTransporter = () => {
  const config = getMailConfig();
  assertMailConfig(config);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
    tls: {
      servername: config.host,
    },
  });
};

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const getRetryAttempts = () => {
  const attempts = Number(process.env.MAIL_RETRY_ATTEMPTS || 3);
  return Number.isInteger(attempts) && attempts > 0 ? attempts : 3;
};

const getRetryDelayMs = () => {
  const delay = Number(process.env.MAIL_RETRY_DELAY_MS || 750);
  return Number.isFinite(delay) && delay >= 0 ? delay : 750;
};

const shouldRetryEmailError = (error) => {
  const code = String(error?.code || '');
  const responseCode = Number(error?.responseCode || 0);

  return (
    ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET', 'EAI_AGAIN'].includes(code)
    || [421, 450, 451, 452, 454].includes(responseCode)
  );
};

const getFrontendUrl = () => (
  process.env.FRONTEND_URL
  || process.env.CLIENT_URL
  || 'https://didzdvaris-booking.vercel.app'
).replace(/\/$/, '');

const normalizeLanguage = (language) => (String(language || '').toLowerCase().startsWith('lt') ? 'lt' : 'en');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const accountLabel = (accountType, language) => {
  if (language === 'lt') {
    return accountType === 'teacher' ? 'mokytojo' : 'tėvo/motinos';
  }

  return accountType === 'teacher' ? 'teacher' : 'parent';
};

const renderEmailShell = ({ heading, subtitle, children, footer }) => `
  <div style="margin:0; padding:32px 16px; background:#eef3f9; font-family:Georgia, 'Times New Roman', serif; color:#102338; line-height:1.6;">
    <div style="max-width:620px; margin:0 auto; border-radius:24px; overflow:hidden; border:1px solid rgba(18,54,93,0.12); box-shadow:0 18px 48px rgba(11,30,54,0.14); background:#ffffff;">
      <div style="padding:26px 32px; background:linear-gradient(180deg,#12365d,#0a2037); color:#fffdf4;">
        <div style="display:inline-block; padding:8px 14px; border-radius:12px; border:1px solid rgba(214,171,43,0.42); background:rgba(255,255,255,0.06); font-weight:700; letter-spacing:0.04em;">
          Didždvario
        </div>
        <h1 style="margin:24px 0 8px; font-size:34px; line-height:1.08; color:#ffffff;">${heading}</h1>
        <p style="margin:0; color:#dfe7f3; font-size:16px;">${subtitle}</p>
      </div>
      <div style="padding:32px;">
        ${children}
      </div>
      <div style="padding:18px 32px; background:#f6f1df; border-top:1px solid rgba(18,54,93,0.08); color:#5c6b7d; font-size:13px;">
        ${footer}
      </div>
    </div>
  </div>
`;

const sendMailOnce = async ({ to, subject, text, html }) => {
  const config = getMailConfig();
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });

  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];
  const pending = Array.isArray(info.pending) ? info.pending : [];

  if (!accepted.length || rejected.length || pending.length) {
    throw new EmailDeliveryError(`Email was not accepted by the SMTP server for ${to}.`);
  }

  return info;
};

const sendMail = async (mail) => {
  const attempts = getRetryAttempts();
  const retryDelayMs = getRetryDelayMs();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await sendMailOnce(mail);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetryEmailError(error)) {
        break;
      }

      await sleep(retryDelayMs * attempt);
    }
  }

  throw new EmailDeliveryError('Email delivery failed after retrying.', lastError);
};

const getPasswordResetCopy = ({ name, resetUrl, accountType, language }) => {
  const label = accountLabel(accountType, language);

  if (language === 'lt') {
    return {
      subject: 'Atkurkite Didždvario paskyros slaptažodį',
      heading: 'Atkurkite slaptažodį',
      subtitle: 'Tėvų ir mokytojų susitikimų rezervavimo sistema',
      greeting: `Sveiki, ${name || 'naudotojau'},`,
      body: `Gavome prašymą atkurti jūsų ${label} paskyros slaptažodį. Paspauskite žemiau esantį mygtuką ir pasirinkite naują slaptažodį.`,
      button: 'Atkurti slaptažodį',
      warning: 'Ši nuoroda galioja 30 minučių. Jei šio prašymo nesiuntėte, galite saugiai ignoruoti šį laišką.',
      fallback: 'Jei mygtukas neveikia, nukopijuokite ir įklijuokite šią nuorodą į naršyklę:',
      footer: 'Išsiųsta Didždvario slaptažodžių pagalbos sistemos.',
      text: [
        `Sveiki, ${name || ''},`,
        '',
        `Gavome prašymą atkurti jūsų ${label} paskyros slaptažodį.`,
        `Atidarykite šią nuorodą: ${resetUrl}`,
        '',
        'Ši nuoroda galioja 30 minučių. Jei šio prašymo nesiuntėte, ignoruokite šį laišką.',
      ].join('\n'),
    };
  }

  return {
    subject: 'Reset your Didždvario password',
    heading: 'Reset your password',
    subtitle: 'Parent-Teacher Meeting Booking System',
    greeting: `Hello ${name || 'there'},`,
    body: `We received a request to reset the password for your ${label} account. Use the secure button below to choose a new password.`,
    button: 'Reset password',
    warning: 'This link expires in 30 minutes. If you did not request this, you can safely ignore this email.',
    fallback: 'If the button does not work, copy and paste this link into your browser:',
    footer: 'Sent by Didždvario password assistance.',
    text: [
      `Hello ${name || ''},`,
      '',
      `We received a request to reset the password for your ${label} account.`,
      `Open this link to choose a new password: ${resetUrl}`,
      '',
      'This link expires in 30 minutes. If you did not request this, you can ignore this email.',
    ].join('\n'),
  };
};

const sendPasswordResetEmail = async ({ to, name, resetUrl, accountType, language }) => {
  const copy = getPasswordResetCopy({
    name,
    resetUrl,
    accountType,
    language: normalizeLanguage(language),
  });

  await sendMail({
    to,
    subject: copy.subject,
    text: copy.text,
    html: renderEmailShell({
      heading: copy.heading,
      subtitle: copy.subtitle,
      footer: copy.footer,
      children: `
        <p style="margin:0 0 16px; font-size:17px;">${copy.greeting}</p>
        <p style="margin:0 0 22px; color:#34465a;">${copy.body}</p>
        <div style="margin:28px 0;">
          <a href="${resetUrl}" style="display:inline-block; padding:14px 24px; border-radius:999px; background:linear-gradient(180deg,#12365d,#0a2037); color:#ffffff; text-decoration:none; font-weight:700; box-shadow:0 12px 28px rgba(10,32,55,0.22);">
            ${copy.button}
          </a>
        </div>
        <div style="padding:16px 18px; border-radius:16px; background:#fff7db; border:1px solid rgba(214,171,43,0.35); color:#102338;">
          ${copy.warning}
        </div>
        <p style="margin:24px 0 8px; color:#5c6b7d; font-size:14px;">${copy.fallback}</p>
        <p style="margin:0; word-break:break-all; font-size:13px;">
          <a href="${resetUrl}" style="color:#12365d;">${resetUrl}</a>
        </p>
      `,
    }),
  });
};

const getWelcomeCopy = ({ name, accountType, loginUrl, language }) => {
  const label = accountLabel(accountType, language);

  if (language === 'lt') {
    const introText = accountType === 'teacher'
      ? 'Jūsų mokytojo paskyra paruošta. Galite tvarkyti konsultacijų laikus ir patogiai sekti tėvų registracijas vienoje vietoje.'
      : 'Jūsų tėvo/motinos paskyra paruošta. Galite peržiūrėti mokytojus, pasirinkti tinkamą susitikimo laiką ir matyti savo rezervacijas.';
    const steps = accountType === 'teacher'
      ? [
        'Prisijunkite prie mokytojo paskyros.',
        'Sukurkite galimus susitikimų laikus.',
        'Stebėkite tėvų registracijas.',
      ]
      : [
        'Prisijunkite prie tėvo/motinos paskyros.',
        'Peržiūrėkite mokytojų sąrašą ir pasirinkite mokytoją.',
        'Pasirinkite laisvą laiką ir patvirtinkite rezervaciją.',
      ];

    return {
      subject: 'Sveiki prisijungę prie Didždvario',
      heading: 'Sveiki, jūsų paskyra paruošta',
      subtitle: 'Jūsų paskyra sėkmingai sukurta',
      badge: 'Paskyra sukurta',
      greeting: `Sveiki, ${name || 'naudotojau'},`,
      introText,
      stepsTitle: 'Ką galite daryti toliau',
      button: 'Prisijungti',
      safety: 'Jei šios paskyros nekūrėte, susisiekite su mokyklos administratoriumi.',
      loginLabel: 'Prisijungimo nuoroda',
      footer: 'Ačiū, kad naudojatės Didždvario rezervavimo sistema.',
      text: [
        `Sveiki, ${name || ''},`,
        '',
        `Jūsų ${label} paskyra sėkmingai sukurta.`,
        introText,
        '',
        'Tolimesni žingsniai:',
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        '',
        `Prisijunkite čia: ${loginUrl}`,
        '',
        'Ačiū, kad naudojatės Didždvario tėvų ir mokytojų susitikimų rezervavimo sistema.',
      ].join('\n'),
      steps,
    };
  }

  const introText = accountType === 'teacher'
    ? 'Your teacher account is now ready. You can manage your consultation availability and keep parent meetings organised in one place.'
    : 'Your parent account is now ready. You can browse teachers, choose suitable meeting times, and keep your bookings easy to find.';
  const steps = accountType === 'teacher'
    ? [
      'Log in to your teacher account.',
      'Create your available meeting slots.',
      'Check registrations as parents book appointments.',
    ]
    : [
      'Log in to your parent account.',
      'Browse the teacher list and choose a teacher.',
      'Select an available meeting slot and confirm your booking.',
    ];

  return {
    subject: 'Welcome to Didždvario',
    heading: 'Welcome, your account is ready',
    subtitle: 'Your account is ready',
    badge: 'Account created',
    greeting: `Hello ${name || 'there'},`,
    introText,
    stepsTitle: 'What you can do next',
    button: 'Go to login',
    safety: 'If you did not create this account, please contact the school administrator.',
    loginLabel: 'Login link',
    footer: 'Thank you for using the Didždvario booking system.',
    text: [
      `Hello ${name || ''},`,
      '',
      `Your ${label} account has been created successfully.`,
      introText,
      '',
      'Next steps:',
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      `Log in here: ${loginUrl}`,
      '',
      'Thank you for using the Didždvario Parent-Teacher Meeting Booking System.',
    ].join('\n'),
    steps,
  };
};

const sendWelcomeEmail = async ({ to, name, accountType, language }) => {
  const loginPath = accountType === 'teacher' ? '/teacher/login' : '/parent/login';
  const loginUrl = `${getFrontendUrl()}${loginPath}`;
  const copy = getWelcomeCopy({
    name,
    accountType,
    loginUrl,
    language: normalizeLanguage(language),
  });

  await sendMail({
    to,
    subject: copy.subject,
    text: copy.text,
    html: renderEmailShell({
      heading: copy.heading,
      subtitle: copy.subtitle,
      footer: copy.footer,
      children: `
        <p style="margin:0 0 8px; color:#5c6b7d; font-size:14px; letter-spacing:0.04em; text-transform:uppercase;">${copy.badge}</p>
        <p style="margin:0 0 16px; font-size:18px;">${copy.greeting}</p>
        <p style="margin:0 0 22px; color:#34465a; font-size:16px;">${copy.introText}</p>
        <div style="padding:18px 20px; border-radius:18px; background:#eef5ff; border:1px solid rgba(18,54,93,0.16); color:#102338;">
          <p style="margin:0 0 12px; font-weight:700; color:#0a2037;">${copy.stepsTitle}</p>
          <ol style="margin:0; padding-left:20px; color:#34465a;">
            ${copy.steps.map((step) => `<li style="margin:0 0 8px;">${step}</li>`).join('')}
          </ol>
        </div>
        <div style="margin:28px 0;">
          <a href="${loginUrl}" style="display:inline-block; padding:14px 24px; border-radius:999px; background:linear-gradient(180deg,#12365d,#0a2037); color:#ffffff; text-decoration:none; font-weight:700; box-shadow:0 12px 28px rgba(10,32,55,0.22);">
            ${copy.button}
          </a>
        </div>
        <div style="padding:14px 16px; border-radius:16px; background:#fff7db; border:1px solid rgba(214,171,43,0.35); color:#102338;">
          <p style="margin:0; font-size:14px;">${copy.safety}</p>
        </div>
        <p style="margin:22px 0 0; color:#5c6b7d; font-size:13px;">
          ${copy.loginLabel}: <a href="${loginUrl}" style="color:#12365d;">${loginUrl}</a>
        </p>
      `,
    }),
  });
};

const getVilniusOffsetMs = (date) => {
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vilnius',
    timeZoneName: 'shortOffset',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || 'GMT+0';

  const match = offsetName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * ((hours * 60) + minutes) * 60 * 1000;
};

const parseMeetingDate = (value) => {
  const stringValue = String(value || '');
  if (!stringValue || /[zZ]|[+-]\d{2}:\d{2}$/.test(stringValue)) {
    return new Date(value);
  }

  const match = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = '0'] = match;
  const utcGuess = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));

  return new Date(utcGuess.getTime() - getVilniusOffsetMs(utcGuess));
};

const formatMeetingDateTime = (value, language = 'en') => {
  const date = parseMeetingDate(value);

  if (Number.isNaN(date.getTime())) {
    return String(value || '');
  }

  return new Intl.DateTimeFormat(language === 'lt' ? 'lt-LT' : 'en-GB', {
    timeZone: 'Europe/Vilnius',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getMeetingReminderCopy = ({
  parentName,
  childName,
  childClass,
  teacherName,
  teacherSubject,
  teacherRoom,
  startTime,
  endTime,
  note,
  language,
}) => {
  const safe = {
    parentName: escapeHtml(parentName || 'there'),
    childName: escapeHtml(childName || '-'),
    childClass: escapeHtml(childClass || '-'),
    teacherName: escapeHtml(teacherName || '-'),
    teacherSubject: escapeHtml(teacherSubject || '-'),
    teacherRoom: escapeHtml(teacherRoom || '-'),
    startTime: escapeHtml(formatMeetingDateTime(startTime, language)),
    endTime: escapeHtml(formatMeetingDateTime(endTime, language)),
    note: escapeHtml(note || ''),
  };

  if (language === 'lt') {
    const details = [
      `Mokytojas: ${teacherName || '-'}`,
      `Dalykas: ${teacherSubject || '-'}`,
      `Kabinetas: ${teacherRoom || '-'}`,
      `Pradzia: ${formatMeetingDateTime(startTime, language)}`,
      `Pabaiga: ${formatMeetingDateTime(endTime, language)}`,
      `Mokinys: ${childName || '-'} (${childClass || '-'})`,
      note ? `Pastaba: ${note}` : null,
    ].filter(Boolean);

    return {
      subject: 'Priminimas apie susitikima su mokytoju',
      heading: 'Susitikimo priminimas',
      subtitle: 'Jusu rezervuotas laikas arteja',
      greeting: `Sveiki, ${safe.parentName},`,
      intro: 'Primename apie jusu suplanuota tevu ir mokytojo susitikima.',
      detailsTitle: 'Susitikimo informacija',
      footer: 'Issiusta Didzdvario rezervavimo sistemos.',
      text: [
        `Sveiki, ${parentName || ''},`,
        '',
        'Primename apie jusu suplanuota tevu ir mokytojo susitikima.',
        '',
        ...details,
      ].join('\n'),
      safe,
    };
  }

  const details = [
    `Teacher: ${teacherName || '-'}`,
    `Subject: ${teacherSubject || '-'}`,
    `Room: ${teacherRoom || '-'}`,
    `Starts: ${formatMeetingDateTime(startTime, language)}`,
    `Ends: ${formatMeetingDateTime(endTime, language)}`,
    `Student: ${childName || '-'} (${childClass || '-'})`,
    note ? `Note: ${note}` : null,
  ].filter(Boolean);

  return {
    subject: 'Reminder: your parent-teacher meeting is coming up',
    heading: 'Meeting reminder',
    subtitle: 'Your booked meeting slot is coming up',
    greeting: `Hello ${safe.parentName},`,
    intro: 'This is a reminder for your scheduled parent-teacher meeting.',
    detailsTitle: 'Meeting details',
    footer: 'Sent by the Didzdvario booking system.',
    text: [
      `Hello ${parentName || ''},`,
      '',
      'This is a reminder for your scheduled parent-teacher meeting.',
      '',
      ...details,
    ].join('\n'),
    safe,
  };
};

const sendMeetingReminderEmail = async ({
  to,
  parentName,
  childName,
  childClass,
  teacherName,
  teacherSubject,
  teacherRoom,
  startTime,
  endTime,
  note,
  language,
}) => {
  const copy = getMeetingReminderCopy({
    parentName,
    childName,
    childClass,
    teacherName,
    teacherSubject,
    teacherRoom,
    startTime,
    endTime,
    note,
    language: normalizeLanguage(language),
  });

  await sendMail({
    to,
    subject: copy.subject,
    text: copy.text,
    html: renderEmailShell({
      heading: copy.heading,
      subtitle: copy.subtitle,
      footer: copy.footer,
      children: `
        <p style="margin:0 0 16px; font-size:18px;">${copy.greeting}</p>
        <p style="margin:0 0 22px; color:#34465a; font-size:16px;">${copy.intro}</p>
        <div style="padding:18px 20px; border-radius:18px; background:#eef5ff; border:1px solid rgba(18,54,93,0.16); color:#102338;">
          <p style="margin:0 0 12px; font-weight:700; color:#0a2037;">${copy.detailsTitle}</p>
          <table style="width:100%; border-collapse:collapse; color:#34465a; font-size:15px;">
            <tr><td style="padding:6px 0; font-weight:700; width:120px;">Teacher</td><td style="padding:6px 0;">${copy.safe.teacherName}</td></tr>
            <tr><td style="padding:6px 0; font-weight:700;">Subject</td><td style="padding:6px 0;">${copy.safe.teacherSubject}</td></tr>
            <tr><td style="padding:6px 0; font-weight:700;">Room</td><td style="padding:6px 0;">${copy.safe.teacherRoom}</td></tr>
            <tr><td style="padding:6px 0; font-weight:700;">Starts</td><td style="padding:6px 0;">${copy.safe.startTime}</td></tr>
            <tr><td style="padding:6px 0; font-weight:700;">Ends</td><td style="padding:6px 0;">${copy.safe.endTime}</td></tr>
            <tr><td style="padding:6px 0; font-weight:700;">Student</td><td style="padding:6px 0;">${copy.safe.childName} (${copy.safe.childClass})</td></tr>
            ${copy.safe.note ? `<tr><td style="padding:6px 0; font-weight:700;">Note</td><td style="padding:6px 0;">${copy.safe.note}</td></tr>` : ''}
          </table>
        </div>
      `,
    }),
  });
};

module.exports = {
  assertMailConfig,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendMeetingReminderEmail,
};
