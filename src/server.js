const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000;
const app = express();
const route = require('./routes');
const db = require('./config/db');
const methodOverride = require('method-override');
const session = require('express-session');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { isLogin } = require('./middlewares/isLogin');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const flash = require('connect-flash');
const hbs = require('handlebars');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);
app.engine(
    'hbs',
    exphbs.engine({
        extname: '.hbs',
        helpers: {
            json: (context) => JSON.stringify(context),
            sum: (a, b) => a + b,
            add: (a, b) => a + b,
            subtract: (a, b) => a - b,
            sub: (a, b) => a - b,
            firstLetter: (str) => {
                if (!str || typeof str !== 'string') return '';
                return str.charAt(0).toUpperCase();
            },
            formatSalary: (salary) => {
                if (!salary) return salary;
                // Don't escape + signs - they should display normally
                return salary;
            },
            req: () => global.req || {},
            ifCond: (v1, op, v2, opts) => {
                const ops = {
                    '==': v1 == v2,
                    '===': v1 === v2,
                    '!=': v1 != v2,
                    '!==': v1 !== v2,
                    '<': v1 < v2,
                    '<=': v1 <= v2,
                    '>': v1 > v2,
                    '>=': v1 >= v2,
                    '&&': v1 && v2,
                    '||': v1 || v2,
                };
                return ops[op] ? opts.fn(this) : opts.inverse(this);
            },
            array: (...args) => args.slice(0, -1),
            ifEquals: (a, b, options) => {
                return a === b ? options.fn(this) : options.inverse(this);
            },
            eq: (a, b) => a === b,
            gt: (a, b) => a > b,
            gte: (a, b) => a >= b,
            lt: (a, b) => a < b,
            lte: (a, b) => a <= b,
            slugify: (str) => {
                if (!str) return '';
                return str.toString()
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Remove special chars
                    .replace(/\s+/g, '-')      // Replace spaces with -
                    .replace(/--+/g, '-')      // Replace multiple - with single -
                    .replace(/^-+|-+$/g, '')   // Trim - from start and end of string
                    .trim();
            },
            truncate: (str, len) => {
                if (typeof str !== 'string') return '';
                if (str.length <= len) return str;
                return str.substring(0, len) + '...';
            },
            substring: (str, start, end) => {
                if (!str) return '';
                str = String(str);
                return str.substring(start, end);
            },
            defaultAvatar: (avatar) => {
                return avatar || '/images/default-avatar.png';
            },
            divide: (a, b) => b !== 0 ? Math.round(a / b) : 0,
            multiply: (a, b) => Math.round(a * b),
            compare: (v1, v2) => v1 === v2,
            range: (start, end) => {
                if (typeof start !== 'number' || typeof end !== 'number') {
                    return [];
                }
                const result = [];
                for (let i = start; i <= end; i++) {
                    result.push(i);
                }
                return result;
            },
            pagination: (currentPage, totalPages) => {
                const pages = [];
                const currentPageNum = parseInt(currentPage);

                // Always show first page
                pages.push(1);

                // Show pages around current page
                const showAround = 2; // Show 2 pages before and after
                let startPage = Math.max(2, currentPageNum - showAround);
                let endPage = Math.min(totalPages - 1, currentPageNum + showAround);

                // Add ellipsis before if needed
                if (startPage > 2) {
                    pages.push('...');
                }

                // Add pages around current page
                for (let i = startPage; i <= endPage; i++) {
                    if (i !== 1 && i !== totalPages) {
                        pages.push(i);
                    }
                }

                // Add ellipsis after if needed
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }

                // Always show last page if different from first
                if (totalPages > 1) {
                    pages.push(totalPages);
                }

                return pages;
            },
            paginationRange: (currentPage, totalPages) => {
                const pages = [];
                const currentPageNum = parseInt(currentPage);

                // Always show first page
                pages.push(1);

                // Show pages around current page
                const showAround = 2; // Show 2 pages before and after
                let startPage = Math.max(2, currentPageNum - showAround);
                let endPage = Math.min(totalPages - 1, currentPageNum + showAround);

                // Add ellipsis before if needed
                if (startPage > 2) {
                    pages.push('...');
                }

                // Add pages around current page
                for (let i = startPage; i <= endPage; i++) {
                    if (i !== 1 && i !== totalPages) {
                        pages.push(i);
                    }
                }

                // Add ellipsis after if needed
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }

                // Always show last page if different from first
                if (totalPages > 1) {
                    pages.push(totalPages);
                }

                return pages;
            },
        },
    }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Middleware session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            maxAge: 3 * 60 * 60 * 1000,
        },
    }),
);

// Middleware setLocals (sau khi có session)
app.use((req, res, next) => {
    res.locals.currentUser = req.session.users || null;
    res.locals.currentBusiness = req.session.business || null;
    res.locals.req = { query: req.query };
    next();
});

// Đã có dòng 56 serve static files từ src/public rồi, không cần trùng lặp
// avatars và logos đã được serve tự động qua dòng 56

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GG_CLIENT_ID,
            clientSecret: process.env.GG_CLIENT_SECRET,
            callbackURL: process.env.GG_CALLBACK_URL,
        },
        (accessToken, refreshToken, profile, done) => {
            done(null, profile);
        },
    ),
);

hbs.registerHelper('formatDate', function (date) {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
});

app.use(cookieParser());

app.use(passport.initialize());
app.use(passport.session());

app.use(methodOverride('_method'));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views')); //_dirname == contextPath

app.use(flash());
// Middleware để đưa flash message vào res.locals
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error'),
    };
    next();
});

app.use(isLogin);
route(app);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

const originalLog = console.log;
console.log = (...args) => {
    const str = args.join(' ');
    if (
        str.includes('Example app listening on port') ||
        str.includes('success') ||
        str.includes('Debugger listening')
    ) {
        originalLog(...args);
    }
};
