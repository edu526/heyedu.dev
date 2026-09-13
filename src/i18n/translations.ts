export type Lang = 'es' | 'en';

export interface TranslationSet {
  nav: {
    about: string;
    projects: string;
    contact: string;
    langToggle: string;
  };
  hero: {
    available: string;
    titles: string[];
    subtitle: string;
    ctaProjects: string;
    ctaGithub: string;
    ctaLinkedin: string;
  };
  about: {
    sectionLabel: string;
    title: string;
    bio1: string;
    bio2: string;
    bio3: string;
    skillsTitle: string;
  };
  projects: {
    sectionLabel: string;
    title: string;
    githubLink: string;
    docsLink: string;
    webLink: string;
    items: {
      devoCli: { name: string; description: string };
      codeLauncher: { name: string; description: string };
      sunatPdf: { name: string; description: string };
    };
  };
  contact: {
    sectionLabel: string;
    title: string;
    subtitle: string;
    cta: string;
    rights: string;
  };
  meta: {
    title: string;
    description: string;
  };
}

export const translations: Record<Lang, TranslationSet> = {
  es: {
    nav: {
      about: 'Sobre mí',
      projects: 'Proyectos',
      contact: 'Contacto',
      langToggle: 'EN',
    },
    hero: {
      available: 'Disponible para trabajar',
      titles: ['Software Engineer', 'DevOps Engineer', 'Full Stack Developer', 'Tech Lead'],
      subtitle: '10 años picando código en frontend, backend e infraestructura — un poco de todo.',
      ctaProjects: 'Ver Proyectos',
      ctaGithub: 'GitHub',
      ctaLinkedin: 'LinkedIn',
    },
    about: {
      sectionLabel: '01 — Sobre mí',
      title: 'Sobre mí',
      bio1: 'Llevo más de 10 años en esto. Empecé en frontend, después caí en backend, y en los últimos años se me fue la mano con AWS y automatización. Ahora hago un poco de todo.',
      bio2: 'Trabajo con AWS, CI/CD, Python y TypeScript. Me gusta meterme en lo que sea que haga falta, desde un pipeline roto hasta un botón que no alinea.',
      bio3: 'Fuera del código, soy músico — la misma disciplina y creatividad que aplico a la tecnología.',
      skillsTitle: 'Stack & Herramientas',
    },
    projects: {
      sectionLabel: '02 — Trabajo',
      title: 'Proyectos',
      githubLink: 'Ver en GitHub',
      docsLink: 'Documentación',
      webLink: 'App Web',
      items: {
        devoCli: {
          name: 'devo-cli',
          description:
            'CLI de productividad para desarrolladores — ahora también como app de escritorio (Tauri + Svelte), independiente y con un set más reducido de flujos, algunos aún más automatizados. Commits automáticos con IA, code review, gestión de AWS SSO, DynamoDB y más.',
        },
        codeLauncher: {
          name: 'Vori',
          description:
            'Lanzador de proyectos estilo Finder multiplataforma (Linux, macOS, Windows). Navega categorías en columnas, ábrelos directo en tu editor o terminal y gestiona workspaces multi-proyecto desde la bandeja.',
        },
        sunatPdf: {
          name: 'sunatpdf',
          description:
            'Convierte XML de comprobantes electrónicos SUNAT (boletas, facturas, notas) a PDF vectorial personalizado. 100% en tu navegador, sin servidor.',
        },
      },
    },
    contact: {
      sectionLabel: '03 — Contacto',
      title: 'Hablemos',
      subtitle: '¿Tienes un proyecto interesante o quieres colaborar? Escríbeme.',
      cta: 'Enviar mensaje',
      rights: 'Todos los derechos reservados.',
    },
    meta: {
      title: 'Eduardo De la Cruz — DevOps Engineer & Tech Lead',
      description:
        'Software Engineer, DevOps & Tech Lead con 10 años de experiencia. Especializado en AWS, CI/CD, Python, TypeScript, Terraform y arquitectura cloud. Lima, Perú.',
    },
  },
  en: {
    nav: {
      about: 'About',
      projects: 'Projects',
      contact: 'Contact',
      langToggle: 'ES',
    },
    hero: {
      available: 'Available for work',
      titles: ['Software Engineer', 'DevOps Engineer', 'Full Stack Developer', 'Tech Lead'],
      subtitle: '10 years writing code across frontend, backend, and infrastructure — a bit of everything.',
      ctaProjects: 'See Projects',
      ctaGithub: 'GitHub',
      ctaLinkedin: 'LinkedIn',
    },
    about: {
      sectionLabel: '01 — Who I am',
      title: 'About me',
      bio1: "I've been doing this for over 10 years. Started in frontend, drifted into backend, and somewhere along the way got really into AWS and automation. These days I do a bit of everything.",
      bio2: "I work with AWS, CI/CD, Python and TypeScript. I like jumping into whatever needs fixing, from a broken pipeline to a button that won't align.",
      bio3: 'Outside of code, I am a musician — the same discipline and creativity I apply to technology.',
      skillsTitle: 'Stack & Tools',
    },
    projects: {
      sectionLabel: '02 — Work',
      title: 'Projects',
      githubLink: 'View on GitHub',
      docsLink: 'Documentation',
      webLink: 'Web App',
      items: {
        devoCli: {
          name: 'devo-cli',
          description:
            'Developer productivity CLI — now also as a desktop app (Tauri + Svelte), independent and with a smaller set of flows, some even more automated. AI-powered commits, code review, AWS SSO management, DynamoDB and more.',
        },
        codeLauncher: {
          name: 'Vori',
          description:
            'Cross-platform Finder-style project launcher (Linux, macOS, Windows). Browse categories in columns, open them in your editor or terminal, and manage multi-project workspaces from the tray.',
        },
        sunatPdf: {
          name: 'sunatpdf',
          description:
            'Converts SUNAT electronic receipt XML (boletas, facturas, notes) to customized vector PDF. 100% in your browser, no server.',
        },
      },
    },
    contact: {
      sectionLabel: '03 — Contact',
      title: "Let's talk",
      subtitle: 'Have an interesting project or want to collaborate? Reach out.',
      cta: 'Send message',
      rights: 'All rights reserved.',
    },
    meta: {
      title: 'Eduardo De la Cruz — DevOps Engineer & Tech Lead',
      description:
        'Software Engineer, DevOps & Tech Lead with 10 years of experience. Specialized in AWS, CI/CD, Python, TypeScript, Terraform and cloud architecture. Lima, Peru.',
    },
  },
};
