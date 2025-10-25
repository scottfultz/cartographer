/**
 * Tech Stack Detection
 *
 * Comprehensive technology detection that rivals BuiltWith.com
 * Analyzes: meta tags, scripts, HTML patterns, headers, global variables, DOM elements
 *
 * @module core/extractors/techStack
 */
// Comprehensive technology signature database
const TECH_SIGNATURES = [
    // === JAVASCRIPT FRAMEWORKS ===
    {
        name: 'React',
        category: 'JavaScript Framework',
        patterns: {
            html: [
                /react/i,
                /data-reactroot/i,
                /data-reactid/i,
                /__react/i
            ],
            script: [
                /react\.js/i,
                /react\.min\.js/i,
                /react-dom/i,
                /\.react\./i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Next.js',
        category: 'JavaScript Framework',
        patterns: {
            html: [
                /__next/i,
                /next-head/i,
                /next\/dist/i
            ],
            script: [
                /_next\/static/i,
                /next\.js/i
            ],
            meta: [
                { name: 'next-head-count' }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Vue.js',
        category: 'JavaScript Framework',
        patterns: {
            html: [
                /\bv-bind\b/i,
                /\bv-if\b/i,
                /\bv-for\b/i,
                /\bv-model\b/i,
                /data-v-/i
            ],
            script: [
                /vue\.js/i,
                /vue\.min\.js/i,
                /vue\.runtime/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Nuxt.js',
        category: 'JavaScript Framework',
        patterns: {
            html: [
                /__nuxt/i,
                /data-n-head/i
            ],
            script: [
                /_nuxt\//i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Angular',
        category: 'JavaScript Framework',
        patterns: {
            html: [
                /ng-app/i,
                /ng-controller/i,
                /ng-version/i,
                /\[ngIf\]/i,
                /\*ngFor/i
            ],
            script: [
                /angular\.js/i,
                /angular\.min\.js/i,
                /@angular/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Svelte',
        category: 'JavaScript Framework',
        patterns: {
            html: [
                /svelte-/i
            ],
            script: [
                /svelte/i
            ]
        },
        certainty: 'medium'
    },
    {
        name: 'jQuery',
        category: 'JavaScript Library',
        patterns: {
            script: [
                /jquery[.-]/i,
                /jquery\.min\.js/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Alpine.js',
        category: 'JavaScript Library',
        patterns: {
            html: [
                /x-data/i,
                /x-show/i,
                /x-bind/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'HTMX',
        category: 'JavaScript Library',
        patterns: {
            html: [
                /hx-get/i,
                /hx-post/i,
                /hx-trigger/i
            ],
            script: [
                /htmx/i
            ]
        },
        certainty: 'high'
    },
    // === CONTENT MANAGEMENT SYSTEMS ===
    {
        name: 'WordPress',
        category: 'CMS',
        patterns: {
            html: [
                /wp-content/i,
                /wp-includes/i,
                /wordpress/i
            ],
            script: [
                /wp-content\/themes/i,
                /wp-content\/plugins/i
            ],
            meta: [
                { name: 'generator', contentPattern: /wordpress/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Drupal',
        category: 'CMS',
        patterns: {
            html: [
                /drupal/i,
                /sites\/all\/modules/i,
                /sites\/default\/files/i
            ],
            meta: [
                { name: 'generator', contentPattern: /drupal/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Joomla',
        category: 'CMS',
        patterns: {
            html: [
                /\/components\/com_/i,
                /\/modules\/mod_/i
            ],
            meta: [
                { name: 'generator', contentPattern: /joomla/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Wix',
        category: 'Website Builder',
        patterns: {
            html: [
                /wix\.com/i,
                /wixstatic\.com/i
            ],
            meta: [
                { name: 'generator', contentPattern: /wix/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Squarespace',
        category: 'Website Builder',
        patterns: {
            html: [
                /squarespace/i,
                /sqsp-/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Shopify',
        category: 'E-commerce',
        patterns: {
            html: [
                /cdn\.shopify\.com/i,
                /shopify/i
            ],
            script: [
                /shopify/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Webflow',
        category: 'Website Builder',
        patterns: {
            html: [
                /webflow/i,
                /wf-/i
            ],
            meta: [
                { name: 'generator', contentPattern: /webflow/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Ghost',
        category: 'CMS',
        patterns: {
            html: [
                /ghost/i
            ],
            meta: [
                { name: 'generator', contentPattern: /ghost/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'HubSpot CMS',
        category: 'CMS',
        patterns: {
            html: [
                /hubspot/i,
                /hs-scripts/i
            ],
            script: [
                /hubspot/i
            ]
        },
        certainty: 'high'
    },
    // === E-COMMERCE PLATFORMS ===
    {
        name: 'Magento',
        category: 'E-commerce',
        patterns: {
            html: [
                /magento/i,
                /mage\/cookies/i
            ],
            script: [
                /mage\//i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'WooCommerce',
        category: 'E-commerce',
        patterns: {
            html: [
                /woocommerce/i,
                /wc-/i
            ],
            script: [
                /woocommerce/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'BigCommerce',
        category: 'E-commerce',
        patterns: {
            html: [
                /bigcommerce/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'PrestaShop',
        category: 'E-commerce',
        patterns: {
            html: [
                /prestashop/i
            ],
            meta: [
                { name: 'generator', contentPattern: /prestashop/i }
            ]
        },
        certainty: 'high'
    },
    // === ANALYTICS & TRACKING ===
    {
        name: 'Google Analytics',
        category: 'Analytics',
        patterns: {
            script: [
                /google-analytics\.com\/analytics\.js/i,
                /googletagmanager\.com\/gtag/i,
                /ga\.js/i,
                /gtag\.js/i
            ],
            html: [
                /UA-\d+-\d+/i, // Universal Analytics ID
                /G-[A-Z0-9]+/i // GA4 ID
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Google Tag Manager',
        category: 'Tag Management',
        patterns: {
            script: [
                /googletagmanager\.com/i
            ],
            html: [
                /GTM-[A-Z0-9]+/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Facebook Pixel',
        category: 'Analytics',
        patterns: {
            script: [
                /connect\.facebook\.net\/.*\/fbevents\.js/i
            ],
            html: [
                /fbq\(/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Hotjar',
        category: 'Analytics',
        patterns: {
            script: [
                /static\.hotjar\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Mixpanel',
        category: 'Analytics',
        patterns: {
            script: [
                /mixpanel/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Segment',
        category: 'Analytics',
        patterns: {
            script: [
                /cdn\.segment\.com/i,
                /analytics\.js/i
            ]
        },
        certainty: 'medium'
    },
    {
        name: 'Plausible',
        category: 'Analytics',
        patterns: {
            script: [
                /plausible\.io/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Matomo',
        category: 'Analytics',
        patterns: {
            script: [
                /matomo/i,
                /piwik/i
            ]
        },
        certainty: 'high'
    },
    // === CDN & HOSTING ===
    {
        name: 'Cloudflare',
        category: 'CDN',
        patterns: {
            header: [
                { name: 'cf-ray' },
                { name: 'server', valuePattern: /cloudflare/i }
            ],
            script: [
                /cloudflare/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Fastly',
        category: 'CDN',
        patterns: {
            header: [
                { name: 'x-served-by', valuePattern: /fastly/i },
                { name: 'x-fastly-request-id' }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Akamai',
        category: 'CDN',
        patterns: {
            header: [
                { name: 'x-akamai-transformed' }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Netlify',
        category: 'Hosting',
        patterns: {
            header: [
                { name: 'server', valuePattern: /netlify/i },
                { name: 'x-nf-request-id' }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Vercel',
        category: 'Hosting',
        patterns: {
            header: [
                { name: 'server', valuePattern: /vercel/i },
                { name: 'x-vercel-id' }
            ]
        },
        certainty: 'high'
    },
    // === WEB SERVERS ===
    {
        name: 'nginx',
        category: 'Web Server',
        patterns: {
            header: [
                { name: 'server', valuePattern: /nginx/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Apache',
        category: 'Web Server',
        patterns: {
            header: [
                { name: 'server', valuePattern: /apache/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Microsoft IIS',
        category: 'Web Server',
        patterns: {
            header: [
                { name: 'server', valuePattern: /microsoft-iis/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'LiteSpeed',
        category: 'Web Server',
        patterns: {
            header: [
                { name: 'server', valuePattern: /litespeed/i }
            ]
        },
        certainty: 'high'
    },
    // === PROGRAMMING LANGUAGES & FRAMEWORKS ===
    {
        name: 'PHP',
        category: 'Programming Language',
        patterns: {
            header: [
                { name: 'x-powered-by', valuePattern: /php/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'ASP.NET',
        category: 'Web Framework',
        patterns: {
            header: [
                { name: 'x-powered-by', valuePattern: /asp\.net/i },
                { name: 'x-aspnet-version' }
            ],
            html: [
                /__VIEWSTATE/i,
                /aspnetcdn\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Express.js',
        category: 'Web Framework',
        patterns: {
            header: [
                { name: 'x-powered-by', valuePattern: /express/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Django',
        category: 'Web Framework',
        patterns: {
            html: [
                /csrfmiddlewaretoken/i
            ]
        },
        certainty: 'medium'
    },
    {
        name: 'Ruby on Rails',
        category: 'Web Framework',
        patterns: {
            header: [
                { name: 'x-powered-by', valuePattern: /phusion passenger/i }
            ],
            html: [
                /csrf-token/i
            ],
            meta: [
                { name: 'csrf-token' }
            ]
        },
        certainty: 'medium'
    },
    {
        name: 'Laravel',
        category: 'Web Framework',
        patterns: {
            html: [
                /laravel/i,
                /csrf-token/i
            ]
        },
        certainty: 'medium'
    },
    // === UI FRAMEWORKS & LIBRARIES ===
    {
        name: 'Bootstrap',
        category: 'UI Framework',
        patterns: {
            html: [
                /bootstrap/i,
                /\bbs-/i,
                /\bcol-md-/i,
                /\bcontainer-fluid/i
            ],
            script: [
                /bootstrap/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Tailwind CSS',
        category: 'UI Framework',
        patterns: {
            html: [
                /\bflex-col\b/i,
                /\bspace-x-\d/i,
                /\bg-gray-\d/i,
                /\bmax-w-\d*xl/i
            ],
            script: [
                /tailwind/i
            ]
        },
        certainty: 'medium'
    },
    {
        name: 'Material-UI',
        category: 'UI Framework',
        patterns: {
            html: [
                /mui-/i,
                /material-ui/i
            ],
            script: [
                /material-ui/i,
                /@mui/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Font Awesome',
        category: 'Icon Library',
        patterns: {
            html: [
                /font-awesome/i,
                /\bfa-/i
            ],
            script: [
                /font-awesome/i,
                /fontawesome/i
            ]
        },
        certainty: 'high'
    },
    // === FONTS ===
    {
        name: 'Google Fonts',
        category: 'Web Font',
        patterns: {
            html: [
                /fonts\.googleapis\.com/i,
                /fonts\.gstatic\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Adobe Fonts (Typekit)',
        category: 'Web Font',
        patterns: {
            html: [
                /use\.typekit\.net/i,
                /typekit\.com/i
            ]
        },
        certainty: 'high'
    },
    // === PAYMENT PROCESSORS ===
    {
        name: 'Stripe',
        category: 'Payment',
        patterns: {
            script: [
                /js\.stripe\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'PayPal',
        category: 'Payment',
        patterns: {
            script: [
                /paypal/i
            ]
        },
        certainty: 'high'
    },
    // === MARKETING & ADVERTISING ===
    {
        name: 'Google AdSense',
        category: 'Advertising',
        patterns: {
            script: [
                /pagead2\.googlesyndication\.com/i,
                /adsbygoogle/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'DoubleClick',
        category: 'Advertising',
        patterns: {
            script: [
                /doubleclick\.net/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Mailchimp',
        category: 'Email Marketing',
        patterns: {
            html: [
                /mailchimp/i,
                /mc\.js/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'HubSpot',
        category: 'Marketing Automation',
        patterns: {
            script: [
                /js\.hs-scripts\.com/i,
                /hubspot/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Intercom',
        category: 'Customer Support',
        patterns: {
            script: [
                /widget\.intercom\.io/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Zendesk',
        category: 'Customer Support',
        patterns: {
            script: [
                /zendesk/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Drift',
        category: 'Customer Support',
        patterns: {
            script: [
                /js\.driftt\.com/i
            ]
        },
        certainty: 'high'
    },
    // === SEO & SCHEMA ===
    {
        name: 'Yoast SEO',
        category: 'SEO Plugin',
        patterns: {
            html: [
                /yoast/i
            ],
            meta: [
                { name: 'generator', contentPattern: /yoast/i }
            ]
        },
        certainty: 'high'
    },
    // === ACCESSIBILITY ===
    {
        name: 'AccessiBe',
        category: 'Accessibility',
        patterns: {
            script: [
                /accessibe/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'UserWay',
        category: 'Accessibility',
        patterns: {
            script: [
                /userway/i
            ]
        },
        certainty: 'high'
    },
    // === VIDEO PLAYERS ===
    {
        name: 'YouTube Embed',
        category: 'Video',
        patterns: {
            html: [
                /youtube\.com\/embed/i,
                /youtube-nocookie\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Vimeo',
        category: 'Video',
        patterns: {
            html: [
                /player\.vimeo\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Video.js',
        category: 'Video',
        patterns: {
            script: [
                /video\.js/i
            ],
            html: [
                /video-js/i
            ]
        },
        certainty: 'high'
    },
    // === SECURITY ===
    {
        name: 'reCAPTCHA',
        category: 'Security',
        patterns: {
            script: [
                /recaptcha/i,
                /google\.com\/recaptcha/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'hCaptcha',
        category: 'Security',
        patterns: {
            script: [
                /hcaptcha/i
            ]
        },
        certainty: 'high'
    },
    // === AUTHENTICATION ===
    {
        name: 'Auth0',
        category: 'Authentication',
        patterns: {
            script: [
                /auth0/i,
                /cdn\.auth0\.com/i
            ],
            html: [
                /auth0/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Okta',
        category: 'Authentication',
        patterns: {
            script: [
                /okta/i,
                /oktacdn\.com/i
            ],
            html: [
                /okta-sign-in/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Firebase Auth',
        category: 'Authentication',
        patterns: {
            script: [
                /firebase-auth/i,
                /firebaseauth\.googleapis\.com/i,
                /__\/firebase\/\d+\.\d+\.\d+\/firebase-auth/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'AWS Cognito',
        category: 'Authentication',
        patterns: {
            script: [
                /amazon-cognito-identity/i,
                /cognito-identity\.amazonaws\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Clerk',
        category: 'Authentication',
        patterns: {
            script: [
                /clerk\.com/i,
                /clerk\.js/i,
                /@clerk\//i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Magic Link',
        category: 'Authentication',
        patterns: {
            script: [
                /magic\.link/i,
                /magic-sdk/i
            ]
        },
        certainty: 'high'
    },
    // === A/B TESTING & EXPERIMENTATION ===
    {
        name: 'Optimizely',
        category: 'A/B Testing',
        patterns: {
            script: [
                /optimizely/i,
                /cdn\.optimizely\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'VWO',
        category: 'A/B Testing',
        patterns: {
            script: [
                /visualwebsiteoptimizer/i,
                /vwo\.com/i,
                /dev\.visualwebsiteoptimizer\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Google Optimize',
        category: 'A/B Testing',
        patterns: {
            script: [
                /optimize\.google\.com/i,
                /googleoptimize\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'AB Tasty',
        category: 'A/B Testing',
        patterns: {
            script: [
                /abtasty/i,
                /try\.abtasty\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Kameleoon',
        category: 'A/B Testing',
        patterns: {
            script: [
                /kameleoon/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Split.io',
        category: 'A/B Testing',
        patterns: {
            script: [
                /split\.io/i,
                /cdn\.split\.io/i
            ]
        },
        certainty: 'high'
    },
    // === FORM BUILDERS ===
    {
        name: 'Typeform',
        category: 'Form Builder',
        patterns: {
            script: [
                /typeform/i,
                /embed\.typeform\.com/i
            ],
            html: [
                /data-tf-/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Jotform',
        category: 'Form Builder',
        patterns: {
            script: [
                /jotform/i,
                /cdn\.jotfor\.ms/i
            ],
            html: [
                /jotform/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Google Forms',
        category: 'Form Builder',
        patterns: {
            html: [
                /docs\.google\.com\/forms/i
            ],
            script: [
                /forms\.google\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Wufoo',
        category: 'Form Builder',
        patterns: {
            script: [
                /wufoo/i,
                /wufoo\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Formstack',
        category: 'Form Builder',
        patterns: {
            script: [
                /formstack/i
            ],
            html: [
                /formstack/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Cognito Forms',
        category: 'Form Builder',
        patterns: {
            script: [
                /cognitoforms/i,
                /services\.cognitoforms\.com/i
            ]
        },
        certainty: 'high'
    },
    // === HEADLESS CMS ===
    {
        name: 'Contentful',
        category: 'Headless CMS',
        patterns: {
            script: [
                /contentful/i,
                /cdn\.contentful\.com/i
            ],
            html: [
                /contentful/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Strapi',
        category: 'Headless CMS',
        patterns: {
            script: [
                /strapi/i
            ],
            header: [
                { name: 'x-powered-by', valuePattern: /strapi/i }
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Sanity',
        category: 'Headless CMS',
        patterns: {
            script: [
                /sanity\.io/i,
                /cdn\.sanity\.io/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Prismic',
        category: 'Headless CMS',
        patterns: {
            script: [
                /prismic\.io/i,
                /cdn\.prismic\.io/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Netlify CMS',
        category: 'Headless CMS',
        patterns: {
            script: [
                /netlify-cms/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Directus',
        category: 'Headless CMS',
        patterns: {
            script: [
                /directus/i
            ]
        },
        certainty: 'medium'
    },
    // === E-COMMERCE (EXPANDED) ===
    {
        name: 'Square Online',
        category: 'E-commerce',
        patterns: {
            script: [
                /squarespace\.com/i, // Note: Square Online uses Squarespace infrastructure
                /square\.site/i,
                /squarecdn\.com/i
            ]
        },
        certainty: 'medium'
    },
    {
        name: 'Ecwid',
        category: 'E-commerce',
        patterns: {
            script: [
                /ecwid/i,
                /app\.ecwid\.com/i
            ],
            html: [
                /ecwid/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'OpenCart',
        category: 'E-commerce',
        patterns: {
            html: [
                /catalog\/view\/theme/i,
                /route=common\//i,
                /route=product\//i
            ],
            script: [
                /catalog\/view\/javascript/i
            ]
        },
        certainty: 'medium'
    },
    {
        name: '3dcart',
        category: 'E-commerce',
        patterns: {
            html: [
                /3dcart/i
            ],
            script: [
                /3dcartstores\.com/i
            ]
        },
        certainty: 'high'
    },
    {
        name: 'Volusion',
        category: 'E-commerce',
        patterns: {
            html: [
                /volusion/i
            ],
            script: [
                /volution\.com/i
            ]
        },
        certainty: 'high'
    }
];
/**
 * Detect technologies used on a webpage
 */
export function detectTechStack(options) {
    const { html, url, headers = {} } = options;
    const detected = new Set();
    // Normalize HTML for better matching
    const htmlLower = html.toLowerCase();
    for (const tech of TECH_SIGNATURES) {
        let matched = false;
        // Check HTML patterns
        if (tech.patterns?.html) {
            for (const pattern of tech.patterns.html) {
                if (pattern.test(html)) {
                    matched = true;
                    break;
                }
            }
        }
        // Check script patterns
        if (!matched && tech.patterns?.script) {
            for (const pattern of tech.patterns.script) {
                if (pattern.test(html)) {
                    matched = true;
                    break;
                }
            }
        }
        // Check meta tag patterns
        if (!matched && tech.patterns?.meta) {
            for (const meta of tech.patterns.meta) {
                const metaRegex = new RegExp(`<meta[^>]*name=["']${meta.name}["'][^>]*content=["']([^"']*)["']`, 'i');
                const metaMatch = html.match(metaRegex);
                if (metaMatch) {
                    if (!meta.contentPattern || meta.contentPattern.test(metaMatch[1])) {
                        matched = true;
                        break;
                    }
                }
            }
        }
        // Check header patterns
        if (!matched && tech.patterns?.header && headers) {
            for (const header of tech.patterns.header) {
                const headerValue = headers[header.name.toLowerCase()];
                if (headerValue) {
                    if (!header.valuePattern || header.valuePattern.test(headerValue)) {
                        matched = true;
                        break;
                    }
                }
            }
        }
        if (matched) {
            detected.add(tech.name);
        }
    }
    return Array.from(detected).sort();
}
/**
 * Get detailed tech stack with categories
 */
export function detectTechStackDetailed(options) {
    const { html, headers = {} } = options;
    const detected = [];
    for (const tech of TECH_SIGNATURES) {
        let matched = false;
        // Check all pattern types (same logic as detectTechStack)
        if (tech.patterns?.html) {
            for (const pattern of tech.patterns.html) {
                if (pattern.test(html)) {
                    matched = true;
                    break;
                }
            }
        }
        if (!matched && tech.patterns?.script) {
            for (const pattern of tech.patterns.script) {
                if (pattern.test(html)) {
                    matched = true;
                    break;
                }
            }
        }
        if (!matched && tech.patterns?.meta) {
            for (const meta of tech.patterns.meta) {
                const metaRegex = new RegExp(`<meta[^>]*name=["']${meta.name}["'][^>]*content=["']([^"']*)["']`, 'i');
                const metaMatch = html.match(metaRegex);
                if (metaMatch) {
                    if (!meta.contentPattern || meta.contentPattern.test(metaMatch[1])) {
                        matched = true;
                        break;
                    }
                }
            }
        }
        if (!matched && tech.patterns?.header && headers) {
            for (const header of tech.patterns.header) {
                const headerValue = headers[header.name.toLowerCase()];
                if (headerValue) {
                    if (!header.valuePattern || header.valuePattern.test(headerValue)) {
                        matched = true;
                        break;
                    }
                }
            }
        }
        if (matched) {
            detected.push({
                name: tech.name,
                category: tech.category,
                certainty: tech.certainty || 'medium'
            });
        }
    }
    return detected.sort((a, b) => a.name.localeCompare(b.name));
}
//# sourceMappingURL=techStack.js.map