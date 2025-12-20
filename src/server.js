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
const { isLogin, userDataMiddleware } = require('./middlewares/isLogin');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const flash = require('connect-flash');
const hbs = require('handlebars');

require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);
app.engine(
    'hbs',
    exphbs.engine({
        extname: '.hbs',
        runtimeOptions: {
            allowProtoPropertiesByDefault: true,
            allowProtoMethodsByDefault: true
        },
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
                const range = [];
                const maxVisiblePages = 5; // Số lượng trang hiển thị tối đa
                let startPage, endPage;

                if (totalPages <= maxVisiblePages) {
                    // Nếu tổng số trang ít hơn hoặc bằng số lượng trang tối đa hiển thị
                    startPage = 1;
                    endPage = totalPages;
                } else {
                    // Nếu tổng số trang nhiều hơn số lượng trang tối đa hiển thị
                    const maxPagesBeforeCurrentPage = Math.floor(maxVisiblePages / 2);
                    const maxPagesAfterCurrentPage = Math.ceil(maxVisiblePages / 2) - 1;

                    if (currentPage <= maxPagesBeforeCurrentPage) {
                        // Trang hiện tại ở gần đầu
                        startPage = 1;
                        endPage = maxVisiblePages;
                    } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
                        // Trang hiện tại ở gần cuối
                        startPage = totalPages - maxVisiblePages + 1;
                        endPage = totalPages;
                    } else {
                        // Trang hiện tại ở giữa
                        startPage = currentPage - maxPagesBeforeCurrentPage;
                        endPage = currentPage + maxPagesAfterCurrentPage;
                    }
                }

                // Thêm các nút phân trang
                for (let i = startPage; i <= endPage; i++) {
                    range.push({
                        page: i,
                        isCurrent: i === currentPage,
                    });
                }

                return range;
            },
            randomColor: (str) => {
                if (!str) return '#6c757d'; // Default gray color
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                
                // Convert hash to hex color
                let color = '#';
                for (let i = 0; i < 3; i++) {
                    const value = (hash >> (i * 8)) & 0xFF;
                    color += ('00' + value.toString(16)).substr(-2);
                }
                return color;
            },
        },
    }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3 * 60 * 60 * 1000 // 3 hours
    },
    store: new (require('connect-mongodb-session')(session))({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name',
        collection: 'sessions'
    })
};

// Cookie parser - MUST be before session
app.use(cookieParser());

// Session middleware
app.use(session(sessionConfig));

// Flash messages middleware
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Make user data available to all views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.business = req.business || null;
    next();
});

// Method override
app.use(methodOverride('_method'));

// Set global variables
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.errors = req.flash('error');
    next();
});

// Session configuration - REMOVED DUPLICATE

// Authentication middleware - must run before userDataMiddleware
app.use(isLogin);

// Make user data available in all views
app.use(userDataMiddleware);

// Backward compatibility for existing code
app.use((req, res, next) => {
    res.locals.currentUser = req.user || req.session.users || null;
    res.locals.currentBusiness = req.userType === 'business' ? req.user : req.session.business || null;
    res.locals.req = { query: req.query };
    next();
});

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

hbs.registerHelper('formatISODate', function (date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
});

// Register additional helpers
hbs.registerHelper('eq', (a, b) => a === b);
hbs.registerHelper('gt', (a, b) => a > b);
hbs.registerHelper('lt', (a, b) => a < b);
hbs.registerHelper('sub', (a, b) => a - b);
hbs.registerHelper('add', (a, b) => a + b);
hbs.registerHelper('paginationRange', (currentPage, totalPages) => {
    const range = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
        range.push(i);
    }
    
    return range;
});

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views')); //_dirname == contextPath

route(app);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

const originalLog = console.log;
console.log = (...args) => {
    try {
        const str = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
            }
            return String(arg);
        }).join(' ');
        
        if (
            str.includes('Example app listening on port') ||
            str.includes('success') ||
            str.includes('Debugger listening')
        ) {
            originalLog(...args);
        }
    } catch (error) {
        originalLog('Console log error:', error.message);
    }
};
