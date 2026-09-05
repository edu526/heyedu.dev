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
      subtitle: '10 años construyendo el puente entre frontend, backend e infraestructura cloud.',
      ctaProjects: 'Ver Proyectos',
      ctaGithub: 'GitHub',
      ctaLinkedin: 'LinkedIn',
    },
    about: {
      sectionLabel: '01 — Sobre mí',
      title: 'Sobre mí',
      bio1: 'Con más de 10 años en la industria del software, he recorrido el camino desde el desarrollo frontend hasta la arquitectura cloud. Mi especialidad es construir sistemas robustos y automatizados que escalan.',
      bio2: 'Trabajo con AWS, pipelines CI/CD, Python y TypeScript — disfruto resolverlo todo, desde la infraestructura hasta la interfaz.',
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
            'CLI de productividad para desarrolladores: commits automáticos con IA, code review, gestión de AWS SSO, DynamoDB y más.',
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
      subtitle: '10 years bridging frontend, backend and cloud infrastructure.',
      ctaProjects: 'See Projects',
      ctaGithub: 'GitHub',
      ctaLinkedin: 'LinkedIn',
    },
    about: {
      sectionLabel: '01 — Who I am',
      title: 'About me',
      bio1: 'With over 10 years in the software industry, I have journeyed from frontend development to cloud architecture. My specialty is building robust, automated systems that scale.',
      bio2: 'I work with AWS, CI/CD pipelines, Python and TypeScript — I enjoy tackling it all, from infrastructure down to the interface.',
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
            'Developer productivity CLI: AI-powered commits, code review, AWS SSO management, DynamoDB and more.',
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
