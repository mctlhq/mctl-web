import { ref, computed } from 'vue'

const DOMAIN_CONFIG: Record<string, { allowed: string[]; default: string }> = {
  'mctl.ai': { allowed: ['en', 'ru'], default: 'en' },
  'mctl.me': { allowed: ['en', 'ru'], default: 'en' },
  'mctl.ru': { allowed: ['ru', 'en'], default: 'ru' },
  'localhost': { allowed: ['ru', 'en'], default: 'ru' },
  '127.0.0.1': { allowed: ['ru', 'en'], default: 'ru' },
}

const STORAGE_KEY = 'mctl_lang'

const translations: Record<string, Record<string, string>> = {
  en: {
    "invitation.invalid_github": "Enter a GitHub username, not a profile URL.",
    "invitation.invalid_email": "Enter a valid email address.",
    "invitation.too_long": "Please shorten this field.",
    "invitation.verification_failed": "Verification failed. Please try again.",
    "invitation.title": "Access is by invitation",
    "invitation.subtitle": "MCTL is welcoming a limited number of teams. Tell us what you want to build; no sign-in is needed to request an invitation.",
    "invitation.submit": "Request access",
    "invitation.github": "GitHub username (optional)",
    "invitation.invited": "Already invited? Sign in",
    "invitation.back": "Request an invitation instead",
    "invitation.saved_title": "Your request is saved",
    "invitation.saved_detail": "We will review your request and contact you by email. You do not need to submit it again. An invitation does not create a workspace automatically.",
    "invitation.reference": "Request reference:",
    "invitation.failed": "We could not confirm that your request was saved. Please try again or use the contact form below.",
    "invitation.rate_limited": "Too many requests. Please try again in five minutes.",
    "invitation.privacy": "We use these details to review your request and contact you. The saved request expires after 90 days. A copy is sent to our private Telegram review channel.",

    // Meta
    'meta.title': 'MCTL \u2014 Kubernetes Platform for Growing Product Teams',
    'meta.description': 'Self-service Kubernetes for product teams. GitOps, secrets, team isolation \u2014 production-ready from day one. No platform team required.',
    'meta.og_title': 'MCTL \u2014 Kubernetes Platform for Growing Product Teams',
    'meta.og_description': 'Self-service Kubernetes for product teams. GitOps, secrets, team isolation \u2014 production-ready from day one. No platform team required.',
    'meta.tw_title': 'MCTL \u2014 Kubernetes Platform for Growing Product Teams',
    'meta.tw_description': 'Self-service Kubernetes for product teams. No platform team required. Production-ready from day one.',

    // Nav
    'nav.platform': 'Platform',
    'nav.how_it_works': 'How It Works',
    'nav.pricing': 'Pricing',
    'nav.contact': 'Contact',
    'nav.request_access': 'Request Access',
    'nav.burger_label': 'Toggle menu',

    // Hero
    'hero.badge': 'Self-service Kubernetes platform',
    'hero.title': 'Kubernetes without building a platform team',
    'hero.subtitle': '<span class="logo-m">M</span><span class="highlight-ctl">CTL</span> gives growing product teams self-service Kubernetes with GitOps, secrets, and team isolation built in.<br>No tickets. No waiting. Production-ready from day one.',
    'hero.cta': 'Request Access',
    'hero.cta_secondary': 'Read the docs',

    // Request Access Form
    'form.title': 'Request Access',
    'form.subtitle': "Sign in with GitHub to get started. We'll set up your team workspace.",
    'form.github_desc': 'We verify your identity via GitHub \u2014 no passwords to remember.',
    'form.github_login': 'Sign in with GitHub',
    'form.logout_title': 'Sign out',
    'form.label.team': 'Team Name',
    'form.placeholder.team': 'my-team',
    'form.validation.team': 'Lowercase alphanumeric with hyphens (max 63 chars)',
    'form.help.team': 'Lowercase with hyphens \u2014 this becomes your workspace namespace',
    'form.label.usecase': 'What will you build?',
    'form.placeholder.usecase': "Tell us about your project and what you'd like to deploy",
    'form.submit': 'Submit Request',

    // Success Modal
    'modal.request_accepted': 'Provisioning request accepted',
    'form.accepted_title': 'Request accepted',
    'form.accepted_detail': 'Your request for workspace "{{name}}" was accepted. Provisioning runs in the background. You do not need to submit it again.',
    'modal.provisioning': 'Your workspace is being provisioned automatically. There is nothing else you need to do now.',
    'modal.signin_unavailable': 'Portal sign-in for self-service accounts is not available yet. Questions?',
    'modal.ready_followup': 'We will email you when your workspace access has been verified. Questions?',
    'modal.contact': 'Contact us',
    'modal.close': 'Got it',

    // Why MCTL
    'why.tag': 'Why MCTL',
    'why.title': 'Built for growing product teams',
    'why.card1.title': 'No Platform Team Required',
    'why.card1.desc': "Most teams can't afford dedicated platform engineers. MCTL gives you a production-grade platform without the headcount.",
    'why.card2.title': 'Self-Service, Not Tickets',
    'why.card2.desc': 'Developers pick templates, configure services, and deploy. No waiting on DevOps for every change.',
    'why.card3.title': 'Team Isolation by Default',
    'why.card3.desc': 'Every team gets its own namespace, RBAC, network policies, and resource quotas on a shared cluster.',
    'why.card4.title': 'GitOps-Native Automation',
    'why.card4.desc': 'Push code, everything deploys. No manual YAML, no kubectl, no ArgoCD babysitting.',
    'why.card5.title': 'Production-Ready from Day One',
    'why.card5.desc': 'Secrets in Vault, TLS via cert-manager, single sign-on across platform tools. Security and ops baked in from the start.',

    // Orchestration
    'orch.tag': 'How MCTL Works',
    'orch.title': 'One control plane for your entire delivery lifecycle',
    'orch.developer.title': 'Developer',
    'orch.developer.desc': 'Code & Push',
    'orch.mctl.title': 'MCTL',
    'orch.mctl.desc': 'Platform Orchestrator',
    'orch.cloud.title': 'Cloud',
    'orch.cloud.desc': 'Deployed & Ready',

    // Features
    'features.tag': 'Platform',
    'features.title': 'Everything your team needs to ship faster',
    'features.card1.title': 'Production-Ready Platform',
    'features.card1.code': 'infrastructure out of the box',
    'features.card1.desc': 'Pre-integrated Kubernetes platform. Scale without rebuilding infrastructure from scratch.',
    'features.card2.title': 'GitOps Delivery',
    'features.card2.code': 'push to deploy',
    'features.card2.desc': 'Fully automated deployments. No manual kubectl. Code moves to production securely and predictably.',
    'features.card3.title': 'Enterprise Security',
    'features.card3.code': 'vault \u00b7 certs \u00b7 sso',
    'features.card3.desc': 'Secrets in Vault, automatic TLS via cert-manager, and single sign-on. Security baked into every layer.',
    'features.card4.title': 'Self-Service Catalog',
    'features.card4.code': 'no tickets \u00b7 no waiting',
    'features.card4.desc': 'Pick from ready-made templates in the Service Catalog. Provision services, databases, and infra in minutes.',
    'features.card5.title': 'AI-Native Operations',
    'features.card5.code': 'MCP tools \u00b7 any MCP client',
    'features.card5.desc': 'Deploy, rollback, preview, and monitor via natural language. Connect Claude, Cursor, VS Code, or any MCP client.',

    // Audience
    'audience.tag': "Who It's For",
    'audience.title': 'Built for teams that want to move fast',
    'audience.card1.title': 'Startups',
    'audience.card1.desc': 'Multiple teams, no dedicated DevOps. Ship to production from day one without hiring platform engineers.',
    'audience.card2.title': 'B2B SaaS',
    'audience.card2.desc': 'Multi-tenant isolation out of the box. Manage customer environments with consistent security and governance.',
    'audience.card3.title': 'Platform Teams',
    'audience.card3.desc': 'Already building an internal platform? Accelerate with a production-ready foundation instead of starting from scratch.',
    'audience.card4.title': 'White-Label Partners',
    'audience.card4.desc': 'Offer a branded developer platform to your clients. MCTL powers the infrastructure \u2014 your brand stays front and center.',

    // Tech Stack
    'tech.tag': 'Technology',
    'tech.title': 'Powered by battle-tested infrastructure',
    'tech.subtitle': 'Industry-proven open source tools, integrated into a unified platform.',
    'tech.catalog': 'Service Catalog',
    'tech.gitops': 'GitOps Engine',
    'tech.secrets': 'Secrets Management',
    'tech.runtime': 'Kubernetes Runtime',

    // How It Works
    'how.tag': 'Getting Started',
    'how.title': 'Three steps to production',
    'how.step1.title': 'Get Your Workspace',
    'how.step1.desc': 'Sign in with GitHub, choose a team name, and request your isolated namespace with RBAC and secrets. Provisioning runs automatically.',
    'how.step1.code': 'Sign In \u2192 Create Team \u2192 Get Namespace',
    'how.step2.title': 'Configure Your Service',
    'how.step2.desc': 'Pick a template from the Service Catalog. Specify database, domain, and secrets. Repo and configs generated automatically.',
    'how.step2.code': 'Choose Template \u2192 Configure \u2192 Generate',
    'how.step3.title': 'Push, Ask AI, or Both',
    'how.step3.desc': 'Push your code and GitOps deploys automatically. Or ask your AI to deploy, rollback, or preview \u2014 via MCP tools.',
    'how.step3.code': 'git push \u2192 Build \u2192 Deploy \u2192 Live \u2713\n"deploy my-app to staging" \u2192 AI \u2192 Live \u2713',

    // Pricing
    'pricing.tag': 'Pricing',
    'pricing.title': 'Simple, transparent plans',
    'pricing.starter.title': 'Starter',
    'pricing.starter.price': 'Free',
    'pricing.starter.desc': 'For individuals and small experiments',
    'pricing.starter.f1': 'Team workspace',
    'pricing.starter.f2': 'Isolated namespace with quotas',
    'pricing.starter.f3': 'Standard templates',
    'pricing.starter.f4': 'Shared infrastructure',
    'pricing.starter.f5': 'Community support',
    'pricing.starter.f6': 'Community MCP access',
    'pricing.starter.cta': 'Request Access',
    'pricing.custom.note': 'Outgrowing the free tier?',
    'pricing.custom.cta': 'Talk to us about a custom plan',
    'pricing.pro.badge': 'Popular',
    'pricing.pro.title': 'Professional',
    'pricing.pro.price': 'Contact Us',
    'pricing.pro.desc': 'For growing engineering teams',
    'pricing.pro.f1': 'Unlimited teams',
    'pricing.pro.f2': 'Custom templates',
    'pricing.pro.f3': 'Dedicated namespaces',
    'pricing.pro.f4': 'Priority support',
    'pricing.pro.f5': 'SLA guarantee',
    'pricing.pro.f6': 'Full MCP toolset',
    'pricing.pro.cta': 'Talk to Sales',
    'pricing.enterprise.title': 'Enterprise',
    'pricing.enterprise.price': 'Custom',
    'pricing.enterprise.desc': 'For organizations at scale',
    'pricing.enterprise.f1': 'White-label platform',
    'pricing.enterprise.f2': 'Dedicated infrastructure',
    'pricing.enterprise.f3': 'Custom integrations',
    'pricing.enterprise.f4': 'Dedicated support engineer',
    'pricing.enterprise.f5': 'Enterprise SLA',
    'pricing.enterprise.f6': 'Custom MCP integrations',
    'pricing.enterprise.cta': 'Contact Us',

    // Contact
    'contact.tag': 'Contact',
    'contact.title': 'Get in Touch',
    'contact.intro': 'Questions about MCTL? Need a custom solution? Our team is here to help.',
    'contact.label.name': 'Name',
    'contact.placeholder.name': 'Your name',
    'contact.label.email': 'Email',
    'contact.placeholder.email': 'your@email.com',
    'contact.label.message': 'Message',
    'contact.placeholder.message': 'How can we help you?',
    'contact.submit': 'Send Message',

    // Footer
    'footer.copyright': '\u00a9 2026 MCTL. All rights reserved.',
    'footer.platform': 'Platform',
    'footer.pricing': 'Pricing',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy Policy',

    // Dynamic JS strings
    'js.oauth.access_denied': 'GitHub authorization was cancelled.',
    'js.oauth.invalid_state': 'Session expired. Please try again.',
    'js.oauth.missing_params': 'Invalid OAuth response. Please try again.',
    'js.oauth.token_exchange': 'Failed to authenticate with GitHub. Please try again.',
    'js.oauth.profile_fetch': 'Could not fetch GitHub profile. Please try again.',
    'js.oauth.failed': 'Authentication failed. Please try again.',
    'js.oauth.parse_error': 'Failed to process authentication. Please try again.',
    'js.oauth.email_unverified': 'Your GitHub account has no verified primary email. Verify it in GitHub settings, then sign in again.',
    'js.team.taken': 'Team "{{name}}" is already taken. Choose a different name.',
    'js.team.check_failed': 'Failed to check team availability. Try again.',
    'js.team.wrong-format': 'Team name has wrong format',
    'js.team.rate_limited': 'Too many checks — wait a moment and try again.',
    'js.team.sign_in_required': 'Sign in with GitHub to check availability.',
    'js.submit.github_required': 'Sign in with GitHub first.',
    'js.auth.expired': 'Your sign-in has expired. Sign in with GitHub again.',
    'js.submit.verification_pending': 'Verification is still running. Try again in a few seconds.',
    'js.submit.verification_unavailable': 'The verification challenge could not load. Disable your ad blocker or reload the page.',
    'js.submit.processing': 'Processing...',
    'js.submit.network_error': 'Network error. Please try again.',
    'js.contact.success': 'Message sent. We will reply to the email address you entered.',
    'js.submit.request_failed': 'The request could not be submitted. Please try again.',
    'js.submit.rate_limited': 'Too many requests. Wait a minute and try again.',
    'js.team.creator_has_tenant': 'Your account already has a workspace.',
    'js.session.unavailable': 'Sign-in is temporarily unavailable. Try again later.',
    'js.session.token_invalid': 'The sign-in response could not be verified. Please try again.',
    'js.session.account_refused': 'This account cannot request a workspace here. Contact us if you think this is a mistake.',
    'js.session.rate_limited': 'Too many sign-in attempts. Wait a minute and try again.',
    'js.session.revoked': 'Your session has ended. Sign in again.',
    'js.session.sign_in_required': 'Sign in to continue.',
    'js.session.not_in_test_group': 'Workspace requests from this account are not open yet.',
    'js.turnstile.expired': 'The verification expired and is refreshing. Submit again in a moment.',
    'js.turnstile.error': 'The verification could not be completed.',
    'js.turnstile.retry': 'Try again',
    'js.contact.fill_all': 'Please fill in all fields.',
    'js.contact.sending': 'Sending...',
    'js.contact.network_error': 'Network error. Please try again.',
    'js.contact.send_failed': 'The message could not be sent. Please try again.',

    // Validation forms
    'validation.required': 'This field is required',
  },

  ru: {
    "invitation.invalid_github": "Введите имя пользователя GitHub, а не ссылку на профиль.",
    "invitation.invalid_email": "Введите корректный email.",
    "invitation.too_long": "Пожалуйста, сократите текст.",
    "invitation.verification_failed": "Проверка не пройдена. Попробуйте ещё раз.",
    "invitation.title": "Доступ пока по приглашениям",
    "invitation.subtitle": "Мы постепенно подключаем новые команды. Расскажите о своём проекте — для заявки не нужно входить в аккаунт.",
    "invitation.submit": "Запросить доступ",
    "invitation.github": "Имя пользователя GitHub (необязательно)",
    "invitation.invited": "Уже есть приглашение? Войти",
    "invitation.back": "Запросить приглашение",
    "invitation.saved_title": "Заявка сохранена",
    "invitation.saved_detail": "Мы рассмотрим заявку и свяжемся с вами по email. Повторно отправлять её не нужно. Приглашение не создаёт workspace автоматически.",
    "invitation.reference": "Номер заявки:",
    "invitation.failed": "Не удалось подтвердить сохранение заявки. Попробуйте ещё раз или воспользуйтесь контактной формой ниже.",
    "invitation.rate_limited": "Слишком много запросов. Попробуйте через пять минут.",
    "invitation.privacy": "Эти данные нужны для рассмотрения заявки и связи с вами. Сохранённая заявка удаляется через 90 дней. Копия поступает в наш закрытый канал Telegram.",

    // Meta
    'meta.title': 'MCTL \u2014 Kubernetes \u0431\u0435\u0437 DevOps-\u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432 \u0432 \u0448\u0442\u0430\u0442\u0435',
    'meta.description': 'Kubernetes \u0434\u043b\u044f \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432\u044b\u0445 \u043a\u043e\u043c\u0430\u043d\u0434: GitOps, \u0441\u0435\u043a\u0440\u0435\u0442\u044b \u0438 \u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438. \u0414\u0435\u043f\u043b\u043e\u0439 \u0432 \u043f\u0440\u043e\u0434 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043d\u044f \u2014 \u0431\u0435\u0437 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u043d\u043d\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b.',
    'meta.og_title': 'MCTL \u2014 Kubernetes \u0431\u0435\u0437 DevOps-\u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432 \u0432 \u0448\u0442\u0430\u0442\u0435',
    'meta.og_description': 'Kubernetes \u0434\u043b\u044f \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432\u044b\u0445 \u043a\u043e\u043c\u0430\u043d\u0434: GitOps, \u0441\u0435\u043a\u0440\u0435\u0442\u044b \u0438 \u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438. \u0414\u0435\u043f\u043b\u043e\u0439 \u0432 \u043f\u0440\u043e\u0434 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043d\u044f \u2014 \u0431\u0435\u0437 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u043d\u043d\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b.',
    'meta.tw_title': 'MCTL \u2014 Kubernetes \u0431\u0435\u0437 DevOps-\u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432 \u0432 \u0448\u0442\u0430\u0442\u0435',
    'meta.tw_description': 'Kubernetes \u0434\u043b\u044f \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432\u044b\u0445 \u043a\u043e\u043c\u0430\u043d\u0434. \u0411\u0435\u0437 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u043d\u043d\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b. \u0412 \u043f\u0440\u043e\u0434 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043d\u044f.',

    // Nav
    'nav.platform': '\u041f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430',
    'nav.how_it_works': '\u041a\u0430\u043a \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
    'nav.pricing': '\u0426\u0435\u043d\u044b',
    'nav.contact': '\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b',
    'nav.request_access': '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f',
    'nav.burger_label': '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0435\u043d\u044e',

    // Hero
    'hero.badge': 'Self-service \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430 Kubernetes',
    'hero.title': 'Kubernetes \u0431\u0435\u0437 DevOps-\u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432 \u0432 \u0448\u0442\u0430\u0442\u0435',
    'hero.subtitle': '<span class="logo-m">M</span><span class="highlight-ctl">CTL</span> \u0434\u0430\u0451\u0442 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432\u044b\u043c \u043a\u043e\u043c\u0430\u043d\u0434\u0430\u043c Kubernetes \u0441 GitOps, \u0441\u0435\u043a\u0440\u0435\u0442\u0430\u043c\u0438 \u0438 \u0438\u0437\u043e\u043b\u044f\u0446\u0438\u0435\u0439 \u2014 \u043f\u0440\u044f\u043c\u043e \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438.<br>\u0411\u0435\u0437 \u0442\u0438\u043a\u0435\u0442\u043e\u0432. \u0411\u0435\u0437 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u0439. \u0413\u043e\u0442\u043e\u0432\u043e \u043a \u043f\u0440\u043e\u0434\u0430\u043a\u0448\u0435\u043d\u0443 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043d\u044f.',
    'hero.cta': '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f',
    'hero.cta_secondary': '\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446\u0438\u044f',

    // Request Access Form
    'form.title': '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f',
    'form.subtitle': '\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 GitHub \u2014 \u043c\u044b \u0441\u043e\u0437\u0434\u0430\u0434\u0438\u043c \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b.',
    'form.github_desc': '\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f \u0447\u0435\u0440\u0435\u0437 GitHub \u2014 \u0431\u0435\u0437 \u043f\u0430\u0440\u043e\u043b\u0435\u0439 \u0438 \u043b\u0438\u0448\u043d\u0438\u0445 \u0448\u0430\u0433\u043e\u0432.',
    'form.github_login': '\u0412\u043e\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 GitHub',
    'form.logout_title': '\u0412\u044b\u0439\u0442\u0438',
    'form.label.team': '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u044b',
    'form.placeholder.team': 'my-team',
    'form.validation.team': '\u0422\u043e\u043b\u044c\u043a\u043e \u0441\u0442\u0440\u043e\u0447\u043d\u044b\u0435 \u0431\u0443\u043a\u0432\u044b, \u0446\u0438\u0444\u0440\u044b \u0438 \u0434\u0435\u0444\u0438\u0441\u044b (\u043d\u0435 \u0431\u043e\u043b\u0435\u0435 63 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432)',
    'form.help.team': '\u0421\u0442\u0440\u043e\u0447\u043d\u044b\u0435 \u0431\u0443\u043a\u0432\u044b \u0447\u0435\u0440\u0435\u0437 \u0434\u0435\u0444\u0438\u0441 \u2014 \u0441\u0442\u0430\u043d\u0435\u0442 \u0432\u0430\u0448\u0438\u043c namespace \u0432 \u043a\u043b\u0430\u0441\u0442\u0435\u0440\u0435',
    'form.label.usecase': '\u0427\u0442\u043e \u043f\u043b\u0430\u043d\u0438\u0440\u0443\u0435\u0442\u0435 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u0442\u044c?',
    'form.placeholder.usecase': '\u0420\u0430\u0441\u0441\u043a\u0430\u0436\u0438\u0442\u0435 \u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0435 \u2014 \u0447\u0442\u043e \u0445\u043e\u0442\u0438\u0442\u0435 \u0440\u0430\u0437\u0432\u0435\u0440\u043d\u0443\u0442\u044c',
    'form.submit': '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443',

    // Success Modal
    'modal.request_accepted': '\u0417\u0430\u043f\u0440\u043e\u0441 \u043d\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043f\u0440\u0438\u043d\u044f\u0442',
    'form.accepted_title': '\u0417\u0430\u044f\u0432\u043a\u0430 \u043f\u0440\u0438\u043d\u044f\u0442\u0430',
    'form.accepted_detail': '\u0412\u0430\u0448\u0430 \u0437\u0430\u044f\u0432\u043a\u0430 \u043d\u0430 workspace \xab{{name}}\xbb \u043f\u0440\u0438\u043d\u044f\u0442\u0430. \u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f \u0432 \u0444\u043e\u043d\u0435. \u041f\u043e\u0432\u0442\u043e\u0440\u043d\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443 \u043d\u0435 \u043d\u0443\u0436\u043d\u043e.',
    'modal.provisioning': '\u0412\u0430\u0448\u0435 \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e \u0441\u043e\u0437\u0434\u0430\u0451\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438. \u0421\u0435\u0439\u0447\u0430\u0441 \u043e\u0442 \u0432\u0430\u0441 \u0431\u043e\u043b\u044c\u0448\u0435 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f.',
    'modal.signin_unavailable': '\u0412\u0445\u043e\u0434 \u0432 \u043f\u043e\u0440\u0442\u0430\u043b \u0434\u043b\u044f \u0441\u0430\u043c\u043e\u0441\u0442\u043e\u044f\u0442\u0435\u043b\u044c\u043d\u043e \u0441\u043e\u0437\u0434\u0430\u043d\u043d\u044b\u0445 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u0415\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b?',
    'modal.ready_followup': '\u041c\u044b \u043d\u0430\u043f\u0438\u0448\u0435\u043c \u0432\u0430\u043c, \u043a\u043e\u0433\u0434\u0430 \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u0440\u0430\u0431\u043e\u0447\u0435\u043c\u0443 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0443 \u0431\u0443\u0434\u0435\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d. \u0415\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441\u044b?',
    'modal.contact': '\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043d\u0430\u043c',
    'modal.close': '\u041f\u043e\u043d\u044f\u0442\u043d\u043e',

    // Why MCTL
    'why.tag': '\u041f\u043e\u0447\u0435\u043c\u0443 MCTL',
    'why.title': '\u0421\u043e\u0437\u0434\u0430\u043d\u043e \u0434\u043b\u044f \u043a\u043e\u043c\u0430\u043d\u0434, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0440\u0430\u0441\u0442\u0443\u0442',
    'why.card1.title': '\u0411\u0435\u0437 DevOps \u0432 \u0448\u0442\u0430\u0442\u0435',
    'why.card1.desc': '\u041d\u0430\u043d\u0438\u043c\u0430\u0442\u044c \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u043d\u043d\u044b\u0445 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432 \u0434\u043e\u0440\u043e\u0433\u043e. MCTL \u0434\u0430\u0451\u0442 \u0433\u043e\u0442\u043e\u0432\u0443\u044e \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0443 \u043f\u0440\u043e\u0434\u0430\u043a\u0448\u0435\u043d-\u0443\u0440\u043e\u0432\u043d\u044f \u2014 \u0431\u0435\u0437 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u043b\u044e\u0434\u0435\u0439 \u0432 \u043a\u043e\u043c\u0430\u043d\u0434\u0435.',
    'why.card2.title': '\u0414\u0435\u043f\u043b\u043e\u0439 \u0431\u0435\u0437 \u0442\u0438\u043a\u0435\u0442\u043e\u0432',
    'why.card2.desc': '\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0447\u0438\u043a\u0438 \u0441\u0430\u043c\u0438 \u0432\u044b\u0431\u0438\u0440\u0430\u044e\u0442 \u0448\u0430\u0431\u043b\u043e\u043d\u044b, \u043d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u044e\u0442 \u0438 \u0434\u0435\u043f\u043b\u043e\u044f\u0442. \u041d\u0438\u043a\u0430\u043a\u043e\u0433\u043e \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f DevOps \u043f\u0440\u0438 \u043a\u0430\u0436\u0434\u043e\u043c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0438.',
    'why.card3.title': '\u0418\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u043e\u043c\u0430\u043d\u0434 \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438',
    'why.card3.desc': '\u041a\u0430\u0436\u0434\u0430\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u2014 \u0441\u0432\u043e\u0439 namespace, RBAC, \u0441\u0435\u0442\u0435\u0432\u044b\u0435 \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0438 \u0438 \u043a\u0432\u043e\u0442\u044b \u0432 \u043e\u0431\u0449\u0435\u043c \u043a\u043b\u0430\u0441\u0442\u0435\u0440\u0435.',
    'why.card4.title': '\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044f \u0447\u0435\u0440\u0435\u0437 GitOps',
    'why.card4.desc': '\u041f\u0443\u0448\u0438\u0448\u044c \u043a\u043e\u0434 \u2014 \u0432\u0441\u0451 \u0434\u0435\u043f\u043b\u043e\u0438\u0442\u0441\u044f \u0441\u0430\u043c\u043e. \u041d\u0438\u043a\u0430\u043a\u043e\u0433\u043e \u0440\u0443\u0447\u043d\u043e\u0433\u043e YAML, \u043d\u0438\u043a\u0430\u043a\u043e\u0433\u043e kubectl, \u043d\u0438\u043a\u0430\u043a\u0438\u0445 \u0434\u0435\u0436\u0443\u0440\u0441\u0442\u0432 \u0443 ArgoCD.',
    'why.card5.title': '\u041f\u0440\u043e\u0434-ready \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043d\u044f',
    'why.card5.desc': 'Vault \u0434\u043b\u044f \u0441\u0435\u043a\u0440\u0435\u0442\u043e\u0432, cert-manager \u0434\u043b\u044f TLS, \u0435\u0434\u0438\u043d\u044b\u0439 \u0432\u0445\u043e\u0434 \u0432\u043e \u0432\u0441\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b. \u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0432\u0441\u0442\u0440\u043e\u0435\u043d\u0430, \u0430 \u043d\u0435 \u043f\u0440\u0438\u043a\u0440\u0443\u0447\u0435\u043d\u0430 \u043f\u043e\u0442\u043e\u043c.',

    // Orchestration
    'orch.tag': '\u041a\u0430\u043a \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 MCTL',
    'orch.title': '\u0415\u0434\u0438\u043d\u043e\u0435 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0432\u0441\u0435\u043c \u0446\u0438\u043a\u043b\u043e\u043c \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438',
    'orch.developer.title': '\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0447\u0438\u043a',
    'orch.developer.desc': '\u041f\u0438\u0448\u0435\u0442 \u043a\u043e\u0434 \u0438 \u043f\u0443\u0448\u0438\u0442',
    'orch.mctl.title': 'MCTL',
    'orch.mctl.desc': '\u041e\u0440\u043a\u0435\u0441\u0442\u0440\u0438\u0440\u0443\u0435\u0442 \u0432\u0441\u0451',
    'orch.cloud.title': '\u041e\u0431\u043b\u0430\u043a\u043e',
    'orch.cloud.desc': '\u0420\u0430\u0437\u0432\u0451\u0440\u043d\u0443\u0442\u043e \u0438 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',

    // Features
    'features.tag': '\u041f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430',
    'features.title': '\u0412\u0441\u0451 \u0434\u043b\u044f \u0431\u044b\u0441\u0442\u0440\u043e\u0439 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u043a\u043e\u0434\u0430 \u0432 \u043f\u0440\u043e\u0434',
    'features.card1.title': '\u041f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430 \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438',
    'features.card1.code': '\u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438',
    'features.card1.desc': '\u0413\u043e\u0442\u043e\u0432\u0430\u044f Kubernetes-\u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430. \u041c\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c \u0431\u0435\u0437 \u043f\u0435\u0440\u0435\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b \u0441 \u043d\u0443\u043b\u044f.',
    'features.card2.title': 'GitOps-\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430',
    'features.card2.code': 'push to deploy',
    'features.card2.desc': '\u0414\u0435\u043f\u043b\u043e\u0438 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u044b. \u041d\u0438\u043a\u0430\u043a\u043e\u0433\u043e \u0440\u0443\u0447\u043d\u043e\u0433\u043e kubectl \u2014 \u043a\u043e\u0434 \u0435\u0434\u0435\u0442 \u0432 \u043f\u0440\u043e\u0434 \u0447\u0438\u0441\u0442\u043e \u0438 \u043f\u0440\u0435\u0434\u0441\u043a\u0430\u0437\u0443\u0435\u043c\u043e.',
    'features.card3.title': '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0443\u0440\u043e\u0432\u043d\u044f enterprise',
    'features.card3.code': 'vault \u00b7 certs \u00b7 sso',
    'features.card3.desc': 'Vault \u0434\u043b\u044f \u0441\u0435\u043a\u0440\u0435\u0442\u043e\u0432, \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 TLS \u0447\u0435\u0440\u0435\u0437 cert-manager \u0438 \u0435\u0434\u0438\u043d\u044b\u0439 \u0432\u0445\u043e\u0434. \u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u043d\u0430 \u043a\u0430\u0436\u0434\u043e\u043c \u0443\u0440\u043e\u0432\u043d\u0435.',
    'features.card4.title': 'Self-service \u043a\u0430\u0442\u0430\u043b\u043e\u0433',
    'features.card4.code': '\u0431\u0435\u0437 \u0442\u0438\u043a\u0435\u0442\u043e\u0432 \u00b7 \u0431\u0435\u0437 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f',
    'features.card4.desc': '\u0413\u043e\u0442\u043e\u0432\u044b\u0435 \u0448\u0430\u0431\u043b\u043e\u043d\u044b \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435 \u0441\u0435\u0440\u0432\u0438\u0441\u043e\u0432. \u0421\u0435\u0440\u0432\u0438\u0441, \u0431\u0430\u0437\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u0438\u043b\u0438 \u0438\u043d\u0444\u0440\u0430 \u2014 \u0440\u0430\u0437\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0437\u0430 \u043c\u0438\u043d\u0443\u0442\u044b.',
    'features.card5.title': 'AI-Native \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438',
    'features.card5.code': 'MCP-\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u00b7 \u043b\u044e\u0431\u043e\u0439 MCP-\u043a\u043b\u0438\u0435\u043d\u0442',
    'features.card5.desc': '\u0414\u0435\u043f\u043b\u043e\u0439, \u0440\u043e\u043b\u043b\u0431\u044d\u043a, \u043f\u0440\u0435\u0432\u044c\u044e \u0438 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 \u043d\u0430 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u043c \u044f\u0437\u044b\u043a\u0435. \u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0435 Claude, Cursor, VS Code \u0438\u043b\u0438 \u043b\u044e\u0431\u043e\u0439 MCP-\u043a\u043b\u0438\u0435\u043d\u0442.',

    // Audience
    'audience.tag': '\u041a\u043e\u043c\u0443 \u043f\u043e\u0434\u043e\u0439\u0434\u0451\u0442',
    'audience.title': '\u0414\u043b\u044f \u043a\u043e\u043c\u0430\u043d\u0434, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0445\u043e\u0442\u044f\u0442 \u0434\u0432\u0438\u0433\u0430\u0442\u044c\u0441\u044f \u0431\u044b\u0441\u0442\u0440\u043e',
    'audience.card1.title': '\u0421\u0442\u0430\u0440\u0442\u0430\u043f\u044b',
    'audience.card1.desc': '\u041d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u043a\u043e\u043c\u0430\u043d\u0434, \u043d\u0435\u0442 \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u043e\u0433\u043e DevOps. \u0414\u0435\u043f\u043b\u043e\u0439 \u0432 \u043f\u0440\u043e\u0434 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0434\u043d\u044f \u2014 \u0431\u0435\u0437 \u043d\u0430\u0439\u043c\u0430 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u043d\u043d\u044b\u0445 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432.',
    'audience.card2.title': 'B2B SaaS',
    'audience.card2.desc': '\u041c\u0443\u043b\u044c\u0442\u0438\u0442\u0435\u043d\u0430\u043d\u0442\u043d\u0430\u044f \u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u0438\u0437 \u043a\u043e\u0440\u043e\u0431\u043a\u0438. \u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0441\u0440\u0435\u0434\u0430\u043c\u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u0441 \u0435\u0434\u0438\u043d\u043e\u0439 \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u043e\u0439 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438.',
    'audience.card3.title': '\u041f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435\u043d\u043d\u044b\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u044b',
    'audience.card3.desc': '\u0423\u0436\u0435 \u0441\u0442\u0440\u043e\u0438\u0442\u0435 \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044e\u044e \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0443? \u0423\u0441\u043a\u043e\u0440\u044c\u0442\u0435\u0441\u044c \u0441 \u0433\u043e\u0442\u043e\u0432\u043e\u0439 \u043e\u0441\u043d\u043e\u0432\u043e\u0439 \u0432\u043c\u0435\u0441\u0442\u043e \u0441\u0442\u0430\u0440\u0442\u0430 \u0441 \u043d\u0443\u043b\u044f.',
    'audience.card4.title': 'White-label \u043f\u0430\u0440\u0442\u043d\u0451\u0440\u044b',
    'audience.card4.desc': '\u0414\u0430\u0439\u0442\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0430\u043c \u0431\u0440\u0435\u043d\u0434\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u0443\u044e dev-\u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0443. MCTL \u0431\u0435\u0440\u0451\u0442 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u043d\u0430 \u0441\u0435\u0431\u044f \u2014 \u0432\u0430\u0448 \u0431\u0440\u0435\u043d\u0434 \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u043d\u0430 \u043f\u0435\u0440\u0432\u043e\u043c \u043f\u043b\u0430\u043d\u0435.',

    // Tech Stack
    'tech.tag': '\u0422\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0438',
    'tech.title': '\u041f\u043e\u0441\u0442\u0440\u043e\u0435\u043d\u043e \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043d\u044b\u0445 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430\u0445',
    'tech.subtitle': '\u041d\u0430\u0434\u0451\u0436\u043d\u044b\u0435 open-source \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b, \u0438\u043d\u0442\u0435\u0433\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0432 \u0435\u0434\u0438\u043d\u0443\u044e \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0443.',
    'tech.catalog': '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0441\u0435\u0440\u0432\u0438\u0441\u043e\u0432',
    'tech.gitops': 'GitOps-\u0434\u0432\u0438\u0436\u043e\u043a',
    'tech.secrets': '\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u0435\u043a\u0440\u0435\u0442\u0430\u043c\u0438',
    'tech.runtime': 'Kubernetes Runtime',

    // How It Works
    'how.tag': '\u041a\u0430\u043a \u043d\u0430\u0447\u0430\u0442\u044c',
    'how.title': '\u0422\u0440\u0438 \u0448\u0430\u0433\u0430 \u0434\u043e \u043f\u0440\u043e\u0434\u0430\u043a\u0448\u0435\u043d\u0430',
    'how.step1.title': '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435 \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e',
    'how.step1.desc': '\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 GitHub, \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043c\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u044b \u0438 \u0437\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u0438\u0437\u043e\u043b\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 namespace \u0441 RBAC \u0438 \u0441\u0435\u043a\u0440\u0435\u0442\u0430\u043c\u0438. \u0420\u0430\u0437\u0432\u0451\u0440\u0442\u044b\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.',
    'how.step1.code': '\u0412\u043e\u0439\u0442\u0438 \u2192 \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043a\u043e\u043c\u0430\u043d\u0434\u0443 \u2192 \u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c namespace',
    'how.step2.title': '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u0442\u0435 \u0441\u0435\u0440\u0432\u0438\u0441',
    'how.step2.desc': '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0448\u0430\u0431\u043b\u043e\u043d \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430. \u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0431\u0430\u0437\u0443 \u0434\u0430\u043d\u043d\u044b\u0445, \u0434\u043e\u043c\u0435\u043d \u0438 \u0441\u0435\u043a\u0440\u0435\u0442\u044b \u2014 \u0440\u0435\u043f\u043e\u0437\u0438\u0442\u043e\u0440\u0438\u0439 \u0438 \u043a\u043e\u043d\u0444\u0438\u0433\u0438 \u0441\u043e\u0437\u0434\u0430\u0434\u0443\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.',
    'how.step2.code': '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0448\u0430\u0431\u043b\u043e\u043d \u2192 \u041d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c \u2192 \u0421\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c',
    'how.step3.title': '\u041f\u0443\u0448\u0438\u0442\u0435 \u0438 \u0434\u0435\u043f\u043b\u043e\u0439\u0442\u0435',
    'how.step3.desc': '\u0417\u0430\u043f\u0443\u0448\u044c\u0442\u0435 \u043a\u043e\u0434 \u2014 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430 \u0441\u0430\u043c\u0430 \u0441\u043e\u0431\u0435\u0440\u0451\u0442, \u043f\u0440\u043e\u0442\u0435\u0441\u0442\u0438\u0440\u0443\u0435\u0442 \u0438 \u0437\u0430\u0434\u0435\u043f\u043b\u043e\u0438\u0442 \u0432 Kubernetes \u0447\u0435\u0440\u0435\u0437 GitOps.',
    'how.step3.code': 'git push \u2192 \u0421\u0431\u043e\u0440\u043a\u0430 \u2192 \u0414\u0435\u043f\u043b\u043e\u0439 \u2192 \u0413\u043e\u0442\u043e\u0432\u043e \u2713',

    // Pricing
    'pricing.tag': '\u0426\u0435\u043d\u044b',
    'pricing.title': '\u041f\u0440\u043e\u0441\u0442\u044b\u0435 \u0438 \u043f\u043e\u043d\u044f\u0442\u043d\u044b\u0435 \u0442\u0430\u0440\u0438\u0444\u044b',
    'pricing.starter.title': 'Starter',
    'pricing.starter.price': '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e',
    'pricing.starter.desc': '\u0414\u043b\u044f \u043e\u0434\u0438\u043d\u043e\u0447\u0435\u043a \u0438 \u043d\u0435\u0431\u043e\u043b\u044c\u0448\u0438\u0445 \u044d\u043a\u0441\u043f\u0435\u0440\u0438\u043c\u0435\u043d\u0442\u043e\u0432',
    'pricing.starter.f1': '\u0420\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e \u043a\u043e\u043c\u0430\u043d\u0434\u044b',
    'pricing.starter.f2': '\u0418\u0437\u043e\u043b\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 namespace \u0441 \u043a\u0432\u043e\u0442\u0430\u043c\u0438',
    'pricing.starter.f3': '\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u044b\u0435 \u0448\u0430\u0431\u043b\u043e\u043d\u044b',
    'pricing.starter.f4': '\u041e\u0431\u0449\u0430\u044f \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430',
    'pricing.starter.f5': '\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u043e\u043e\u0431\u0449\u0435\u0441\u0442\u0432\u0430',
    'pricing.starter.f6': 'Community MCP',
    'pricing.starter.cta': '\u041f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f',
    'pricing.custom.note': '\u041f\u0435\u0440\u0435\u0440\u0430\u0441\u0442\u0430\u0435\u0442\u0435 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 \u0442\u0430\u0440\u0438\u0444?',
    'pricing.custom.cta': '\u041e\u0431\u0441\u0443\u0434\u0438\u0442\u044c \u0438\u043d\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043b\u0430\u043d',
    'pricing.pro.badge': '\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e',
    'pricing.pro.title': 'Professional',
    'pricing.pro.price': '\u041e\u0431\u0441\u0443\u0434\u0438\u043c',
    'pricing.pro.desc': '\u0414\u043b\u044f \u0440\u0430\u0441\u0442\u0443\u0449\u0438\u0445 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d\u044b\u0445 \u043a\u043e\u043c\u0430\u043d\u0434',
    'pricing.pro.f1': '\u041d\u0435\u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u043e\u0435 \u0447\u0438\u0441\u043b\u043e \u043a\u043e\u043c\u0430\u043d\u0434',
    'pricing.pro.f2': '\u041a\u0430\u0441\u0442\u043e\u043c\u043d\u044b\u0435 \u0448\u0430\u0431\u043b\u043e\u043d\u044b',
    'pricing.pro.f3': '\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0435 namespaces',
    'pricing.pro.f4': '\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430',
    'pricing.pro.f5': '\u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f SLA',
    'pricing.pro.f6': '\u041f\u043e\u043b\u043d\u044b\u0439 \u043d\u0430\u0431\u043e\u0440 MCP-\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u043e\u0432',
    'pricing.pro.cta': '\u041f\u043e\u0433\u043e\u0432\u043e\u0440\u0438\u0442\u044c \u0441 \u043a\u043e\u043c\u0430\u043d\u0434\u043e\u0439',
    'pricing.enterprise.title': 'Enterprise',
    'pricing.enterprise.price': '\u041f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443',
    'pricing.enterprise.desc': '\u0414\u043b\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0439 \u043b\u044e\u0431\u043e\u0433\u043e \u043c\u0430\u0441\u0448\u0442\u0430\u0431\u0430',
    'pricing.enterprise.f1': 'White-label \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430',
    'pricing.enterprise.f2': '\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u0430\u044f \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430',
    'pricing.enterprise.f3': '\u041a\u0430\u0441\u0442\u043e\u043c\u043d\u044b\u0435 \u0438\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438',
    'pricing.enterprise.f4': '\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0438\u043d\u0436\u0435\u043d\u0435\u0440 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438',
    'pricing.enterprise.f5': 'Enterprise SLA',
    'pricing.enterprise.f6': '\u041a\u0430\u0441\u0442\u043e\u043c\u043d\u044b\u0435 MCP \u0438\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438',
    'pricing.enterprise.cta': '\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u043d\u0430\u043c',

    // Contact
    'contact.tag': '\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b',
    'contact.title': '\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043d\u0430\u043c',
    'contact.intro': '\u0412\u043e\u043f\u0440\u043e\u0441\u044b \u043f\u0440\u043e MCTL? \u041d\u0443\u0436\u043d\u043e \u043d\u0435\u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u043e\u0435 \u0440\u0435\u0448\u0435\u043d\u0438\u0435? \u041c\u044b \u043d\u0430 \u0441\u0432\u044f\u0437\u0438.',
    'contact.label.name': '\u0418\u043c\u044f',
    'contact.placeholder.name': '\u0412\u0430\u0448\u0435 \u0438\u043c\u044f',
    'contact.label.email': 'Email',
    'contact.placeholder.email': '\u0432\u0430\u0448@email.com',
    'contact.label.message': '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435',
    'contact.placeholder.message': '\u0427\u0435\u043c \u043c\u043e\u0436\u0435\u043c \u043f\u043e\u043c\u043e\u0447\u044c?',
    'contact.submit': '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c',

    // Footer
    'footer.copyright': '\u00a9 2026 MCTL. \u0412\u0441\u0435 \u043f\u0440\u0430\u0432\u0430 \u0437\u0430\u0449\u0438\u0449\u0435\u043d\u044b.',
    'footer.platform': '\u041f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430',
    'footer.pricing': '\u0426\u0435\u043d\u044b',
    'footer.contact': '\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b',
    'footer.privacy': '\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438',

    // Dynamic JS strings
    'js.oauth.access_denied': '\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f \u0447\u0435\u0440\u0435\u0437 GitHub \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430.',
    'js.oauth.invalid_state': '\u0421\u0435\u0441\u0441\u0438\u044f \u0443\u0441\u0442\u0430\u0440\u0435\u043b\u0430 \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.oauth.missing_params': '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442 OAuth \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.oauth.token_exchange': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 GitHub \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.oauth.profile_fetch': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c GitHub \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.oauth.failed': '\u041e\u0448\u0438\u0431\u043a\u0430 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.oauth.parse_error': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u043e\u0442\u0432\u0435\u0442 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.oauth.email_unverified': '\u0412 \u0432\u0430\u0448\u0435\u043c \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0435 GitHub \u043d\u0435\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u043e\u0433\u043e \u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0433\u043e \u0430\u0434\u0440\u0435\u0441\u0430. \u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0435\u0433\u043e \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 GitHub \u0438 \u0432\u043e\u0439\u0434\u0438\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.',
    'js.team.taken': '\u0418\u043c\u044f "{{name}}" \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442\u043e \u2014 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043e\u0435.',
    'js.team.check_failed': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0438\u043c\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u044b \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.team.sign_in_required': '\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 GitHub, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0441\u0442\u044c.',
    'js.team.wrong-format': '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0438\u043c\u0435\u043d\u0438 \u043a\u043e\u043c\u0430\u043d\u0434\u044b.',
    'js.team.rate_limited': '\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u043e\u043a \u2014 \u043f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 \u043d\u0435\u043c\u043d\u043e\u0433\u043e \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435.',
    'js.auth.expired': '\u0421\u0440\u043e\u043a \u0432\u0445\u043e\u0434\u0430 \u0438\u0441\u0442\u0451\u043a. \u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 GitHub \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.submit.github_required': '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u043e\u0439\u0434\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 GitHub.',
    'js.submit.verification_pending': '\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0435\u0449\u0451 \u0438\u0434\u0451\u0442. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043f\u0430\u0440\u0443 \u0441\u0435\u043a\u0443\u043d\u0434.',
    'js.submit.verification_unavailable': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443. \u041e\u0442\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0449\u0438\u043a \u0440\u0435\u043a\u043b\u0430\u043c\u044b \u0438\u043b\u0438 \u043f\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443.',
    'js.submit.processing': '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c...',
    'js.submit.network_error': '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438 \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.contact.success': '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e. \u041c\u044b \u043e\u0442\u0432\u0435\u0442\u0438\u043c \u043d\u0430 \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u044b\u0439 \u0432\u0430\u043c\u0438 \u0430\u0434\u0440\u0435\u0441.',
    'js.submit.request_failed': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.submit.rate_limited': '\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432. \u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 \u043c\u0438\u043d\u0443\u0442\u0443 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.',
    'js.team.creator_has_tenant': '\u0423 \u0432\u0430\u0448\u0435\u0433\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e.',
    'js.session.unavailable': '\u0412\u0445\u043e\u0434 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.',
    'js.session.token_invalid': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442 \u0432\u0445\u043e\u0434\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.session.account_refused': '\u0421 \u044d\u0442\u043e\u0433\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 \u043d\u0435\u043b\u044c\u0437\u044f \u0437\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u0440\u0430\u0431\u043e\u0447\u0435\u0435 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u043e. \u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043d\u0430\u043c, \u0435\u0441\u043b\u0438 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0435 \u044d\u0442\u043e \u043e\u0448\u0438\u0431\u043a\u043e\u0439.',
    'js.session.rate_limited': '\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u043e\u043f\u044b\u0442\u043e\u043a \u0432\u0445\u043e\u0434\u0430. \u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 \u043c\u0438\u043d\u0443\u0442\u0443 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.',
    'js.session.revoked': '\u0421\u0435\u0441\u0441\u0438\u044f \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430. \u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.',
    'js.session.sign_in_required': '\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c.',
    'js.session.not_in_test_group': '\u0417\u0430\u043f\u0440\u043e\u0441\u044b \u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0430 \u0441 \u044d\u0442\u043e\u0433\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 \u043f\u043e\u043a\u0430 \u043d\u0435 \u043e\u0442\u043a\u0440\u044b\u0442\u044b.',
    'js.turnstile.expired': '\u0421\u0440\u043e\u043a \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438\u0441\u0442\u0451\u043a, \u043e\u043d\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u0442\u0441\u044f. \u041e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0444\u043e\u0440\u043c\u0443 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0447\u0435\u0440\u0435\u0437 \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0435\u043a\u0443\u043d\u0434.',
    'js.turnstile.error': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0439\u0442\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443.',
    'js.turnstile.retry': '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c',
    'js.contact.fill_all': '\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0432\u0441\u0435 \u043f\u043e\u043b\u044f.',
    'js.contact.sending': '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c...',
    'js.contact.network_error': '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438 \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
    'js.contact.send_failed': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',

    // Validation forms
    'validation.required': 'Это обязательное поле',
  },
}

function getDomainConfig(): { allowed: string[]; default: string } {
  if (typeof window === 'undefined') {
    return { allowed: ['en', 'ru'], default: 'en' }
  }
  return DOMAIN_CONFIG[window.location.hostname] || { allowed: ['en'], default: 'en' }
}

function detectLang(cfg: { allowed: string[]; default: string }): string {
  if (typeof window === 'undefined') return cfg.default

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && cfg.allowed.includes(saved)) return saved

  const browser = (navigator.language || 'en').split('-')[0].toLowerCase()
  if (cfg.allowed.includes(browser)) return browser

  return cfg.default
}

const domainCfg = getDomainConfig()
const locale = ref(detectLang(domainCfg))

if (typeof window !== 'undefined') {
  localStorage.setItem(STORAGE_KEY, locale.value)
}

export function useI18n() {
  function t(key: string, vars?: Record<string, string>): string {
    const langMap = translations[locale.value] || {}
    const fallbackMap = translations['en'] || {}
    let str = langMap[key] !== undefined ? langMap[key] : (fallbackMap[key] !== undefined ? fallbackMap[key] : key)
    if (vars) {
      str = str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined ? vars[k] : '')
    }
    return str
  }

  function setLocale(lang: string) {
    if (!domainCfg.allowed.includes(lang)) return
    locale.value = lang
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang)
      document.documentElement.lang = lang
    }
  }

  return {
    t,
    locale,
    setLocale,
    allowed: domainCfg.allowed,
  }
}
