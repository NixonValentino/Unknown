from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime
from functools import wraps
from dotenv import load_dotenv
load_dotenv()
import os

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)

app.secret_key = os.environ.get("SECRET_KEY")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'unknownbooks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

db = SQLAlchemy(app)


# ════════════════════════════════════════════
#  MODELS
# ════════════════════════════════════════════

class User(db.Model):
    __tablename__ = 'user'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    # Langganan: None = belum, 'monthly' | 'yearly' = aktif
    subscription_type      = db.Column(db.String(20),  nullable=True)
    subscription_expires   = db.Column(db.DateTime,    nullable=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def is_premium(self) -> bool:
        """True jika langganan masih aktif."""
        if not self.subscription_type or not self.subscription_expires:
            return False
        return datetime.utcnow() < self.subscription_expires

    def __repr__(self):
        return f'<User {self.email}>'


class Book(db.Model):
    __tablename__ = 'book'

    id     = db.Column(db.Integer, primary_key=True)
    title  = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(150), nullable=False)
    cover  = db.Column(db.String(300), default='/assets/bookShowcase/1.svg')
    desc   = db.Column(db.Text,        default='')
    rating = db.Column(db.String(10),  default='5/5')
    stars  = db.Column(db.String(10),  default='★★★★★')
    badge  = db.Column(db.String(20),  default='free')   # 'free' | 'premium'
    lang   = db.Column(db.String(50),  default='Indonesia')
    pages  = db.relationship('BookPage', backref='book', lazy=True,
                             order_by='BookPage.page_number')


class BookPage(db.Model):
    __tablename__ = 'book_page'

    id            = db.Column(db.Integer, primary_key=True)
    book_id       = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    page_number   = db.Column(db.Integer, nullable=False)
    page_type     = db.Column(db.String(20), default='text')
    # type: 'cover' | 'chapter' | 'text' | 'blank'
    content       = db.Column(db.Text,    default='')
    chapter_num   = db.Column(db.Integer, nullable=True)
    chapter_title = db.Column(db.String(200), nullable=True)


with app.app_context():
    db.create_all()


# ════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════

def is_logged_in() -> bool:
    return 'user_email' in session


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_logged_in():
            return redirect(url_for('auth_page'))
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    return {
        'id':       session.get('user_id'),
        'name':     session.get('user_name', ''),
        'email':    session.get('user_email', ''),
        'initials': ''.join(
            part[0].upper()
            for part in session.get('user_name', 'U').split()[:2]
        )
    }


def get_db_user():
    """Ambil user object dari DB berdasarkan session."""
    uid = session.get('user_id')
    if not uid:
        return None
    return User.query.get(uid)


# ════════════════════════════════════════════
#  HALAMAN PUBLIK
# ════════════════════════════════════════════

@app.route('/')
def landing():
    return render_template('LandingPage.html', logged_in=is_logged_in())


@app.route('/login', methods=['GET'])
@app.route('/register', methods=['GET'])
def auth_page():
    if is_logged_in():
        return redirect(url_for('dashboard'))
    return render_template('auth.html')


# ════════════════════════════════════════════
#  HALAMAN LOGIN REQUIRED
# ════════════════════════════════════════════

@app.route('/dashboard')
@login_required
def dashboard():
    user = get_current_user()
    return render_template('Dashboard.html', user=user)


@app.route('/detail')
@login_required
def detail():
    user    = get_current_user()
    db_user = get_db_user()
    title   = request.args.get('title', '')
    
    # Cari buku di database berdasarkan title
    db_book = Book.query.filter_by(title=title).first() if title else None
    
    # Jika ditemukan di DB, gunakan data dari DB; jika tidak, gunakan dari query params
    if db_book:
        book = {
            'id':     db_book.id,
            'cover':  db_book.cover,
            'title':  db_book.title,
            'author': db_book.author,
            'stars':  db_book.stars,
            'rating': db_book.rating,
            'badge':  db_book.badge,
            'lang':   db_book.lang,
            'desc':   db_book.desc,
        }
    else:
        book = {
            'id':     '0',
            'cover':  request.args.get('cover',  '/assets/bookShowcase/1.svg'),
            'title':  request.args.get('title',  'Judul Buku'),
            'author': request.args.get('author', 'Unknown'),
            'stars':  request.args.get('stars',  '★★★★★'),
            'rating': request.args.get('rating', '5/5'),
            'badge':  request.args.get('badge',  ''),
            'lang':   request.args.get('lang',   ''),
            'desc':   request.args.get('desc',   'Deskripsi belum tersedia.'),
        }
    return render_template('detail.html', user=user, book=book,
                           is_premium=db_user.is_premium if db_user else False)


@app.route('/profile')
@login_required
def profile():
    user    = get_current_user()
    db_user = get_db_user()
    return render_template('profile.html', user=user, db_user=db_user)


# ════════════════════════════════════════════
#  READER — cek akses premium
# ════════════════════════════════════════════

@app.route('/read/<int:book_id>')
@login_required
def reader(book_id):
    db_user = get_db_user()
    book    = Book.query.get_or_404(book_id)

    # Kalau buku premium tapi user belum langganan → redirect ke halaman subscribe
    if book.badge == 'premium' and not db_user.is_premium:
        return redirect(url_for('subscribe', next=f'/read/{book_id}'))

    return render_template('Reader.html', book=book)


# ════════════════════════════════════════════
#  SUBSCRIBE — halaman langganan
# ════════════════════════════════════════════

@app.route('/subscribe')
@login_required
def subscribe():
    user    = get_current_user()
    db_user = get_db_user()
    next_url = request.args.get('next', '/dashboard')
    plans = [
        {
            'id':       'monthly',
            'name':     'Bulanan',
            'price':    'Rp 29.000',
            'period':   '/ bulan',
            'desc':     'Akses semua buku premium selama 30 hari.',
            'popular':  False,
        },
        {
            'id':       'yearly',
            'name':     'Tahunan',
            'price':    'Rp 249.000',
            'period':   '/ tahun',
            'desc':     'Hemat 30% dibanding bulanan. Akses penuh 1 tahun.',
            'popular':  True,
        },
    ]
    return render_template('subscribe.html',
                           user=user,
                           db_user=db_user,
                           plans=plans,
                           next_url=next_url)


# ════════════════════════════════════════════
#  API — AKTIVASI LANGGANAN (demo/fake)
# ════════════════════════════════════════════

@app.route('/api/subscribe', methods=['POST'])
@login_required
def api_subscribe():
    """
    POST /api/subscribe
    Body JSON: { plan: 'monthly' | 'yearly' }
    Demo: langsung aktifkan tanpa payment gateway.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify(success=False, message='Data tidak valid.'), 400

    plan    = data.get('plan')
    db_user = get_db_user()

    if not db_user:
        return jsonify(success=False, message='User tidak ditemukan.'), 404

    if plan == 'monthly':
        db_user.subscription_type    = 'monthly'
        db_user.subscription_expires = datetime.utcnow() + timedelta(days=30)
    elif plan == 'yearly':
        db_user.subscription_type    = 'yearly'
        db_user.subscription_expires = datetime.utcnow() + timedelta(days=365)
    else:
        return jsonify(success=False, message='Plan tidak valid.'), 400

    db.session.commit()

    # Update session agar is_premium langsung terasa
    session['subscription_type'] = db_user.subscription_type

    return jsonify(
        success=True,
        message=f'Langganan {plan} berhasil diaktifkan!',
        expires=db_user.subscription_expires.strftime('%d %B %Y'),
        redirect=data.get('next', '/dashboard')
    ), 200


# ════════════════════════════════════════════
#  API — KONTEN HALAMAN BUKU
# ════════════════════════════════════════════

@app.route('/api/book/<int:book_id>/pages')
@login_required
def api_book_pages(book_id):
    db_user = get_db_user()
    book    = Book.query.get_or_404(book_id)

    if book.badge == 'premium' and not db_user.is_premium:
        return jsonify(success=False, message='Konten premium. Silakan berlangganan.'), 403

    pages = []
    for p in book.pages:
        pages.append({
            'type':         p.page_type,
            'content':      p.content,
            'chapterNum':   p.chapter_num,
            'chapterTitle': p.chapter_title,
            'tocLabel':     f'Bab {p.chapter_num}: {p.chapter_title}'
                            if p.page_type == 'chapter' else None,
        })

    return jsonify(
        success=True,
        book={'id': book.id, 'title': book.title, 'author': book.author},
        pages=pages
    ), 200


# ════════════════════════════════════════════
#  API — STATUS PREMIUM USER
# ════════════════════════════════════════════

@app.route('/api/me')
def api_me():
    if not is_logged_in():
        return jsonify(logged_in=False), 200

    db_user = get_db_user()
    return jsonify(
        logged_in=True,
        user={
            'id':         session.get('user_id'),
            'name':       session.get('user_name'),
            'email':      session.get('user_email'),
            'initials':   ''.join(
                part[0].upper()
                for part in session.get('user_name', 'U').split()[:2]
            ),
            'is_premium': db_user.is_premium if db_user else False,
            'subscription_type':    db_user.subscription_type if db_user else None,
            'subscription_expires': db_user.subscription_expires.strftime('%d %B %Y')
                                    if db_user and db_user.subscription_expires else None,
        }
    ), 200


# ════════════════════════════════════════════
#  AUTH ROUTES
# ════════════════════════════════════════════

@app.route('/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify(success=False, message='Data tidak valid.'), 400

    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    remember = bool(data.get('remember', False))

    if not email or not password:
        return jsonify(success=False, message='Email dan kata sandi wajib diisi.'), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return jsonify(success=False, message='Email atau kata sandi salah.'), 401

    session.permanent         = remember
    session['user_id']        = user.id
    session['user_email']     = user.email
    session['user_name']      = user.name

    return jsonify(success=True, message='Login berhasil.',
                   redirect=url_for('dashboard')), 200


@app.route('/auth/register', methods=['POST'])
def auth_register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify(success=False, message='Data tidak valid.'), 400

    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not name or not email or not password:
        return jsonify(success=False, message='Semua field wajib diisi.'), 400
    if len(password) < 6:
        return jsonify(success=False, message='Kata sandi minimal 6 karakter.'), 400
    if User.query.filter_by(email=email).first():
        return jsonify(success=False, message='Email sudah terdaftar.'), 409

    new_user = User(name=name, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    session['user_id']    = new_user.id
    session['user_email'] = new_user.email
    session['user_name']  = new_user.name

    return jsonify(success=True, message='Akun berhasil dibuat.',
                   redirect=url_for('dashboard')), 201


@app.route('/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify(success=True, message='Logout berhasil.',
                   redirect=url_for('landing')), 200


# ════════════════════════════════════════════
#  ASSETS & ERROR HANDLERS
# ════════════════════════════════════════════
@app.route('/api/books')
def api_books_list():
    """Debug endpoint - lihat semua buku di database"""
    books = Book.query.all()
    books_list = [
        {
            'id': b.id,
            'title': b.title,
            'author': b.author,
            'badge': b.badge,
            'pages_count': len(b.pages)
        }
        for b in books
    ]
    return jsonify(success=True, count=len(books_list), books=books_list)


@app.route('/seed-db')
def seed_db():
    """Populate database dengan sample data"""
    try:
        BookPage.query.delete()
        Book.query.delete()
        db.session.commit()
        
        books_data = [
            {
                'title': 'Mengendalikan Emosi Primitif',
                'author': 'Unknown',
                'cover': '/assets/bookShowcase/6.svg',
                'desc': 'Eksplorasi mendalam tentang cara mengendalikan emosi primitif.',
                'rating': '4.8/5 (31 ulasan)',
                'stars': '★★★★★',
                'badge': 'premium',
                'lang': 'Indonesia'
            },
            {
                'title': 'Origin of Human Behavior 101',
                'author': 'Unknown',
                'cover': '/assets/bookShowcase/7.svg',
                'desc': 'Eksplorasi asal-usul perilaku manusia.',
                'rating': '5/5 (24 ulasan)',
                'stars': '★★★★★',
                'badge': 'premium',
                'lang': '🇺🇸 English'
            },
            {
                'title': 'The Art of Thinking',
                'author': 'Unknown',
                'cover': '/assets/bookShowcase/1.svg',
                'desc': 'Panduan berpikir kritis dan kreatif.',
                'rating': '4.9/5 (42 ulasan)',
                'stars': '★★★★★',
                'badge': 'free',
                'lang': 'Indonesia'
            },
        ]
        
        for book_data in books_data:
            book = Book(**book_data)
            db.session.add(book)
            db.session.flush()
            for page_num in range(1, 6):
                page = BookPage(
                    book_id=book.id,
                    page_number=page_num,
                    page_type='text' if page_num > 1 else 'cover',
                    content=f'<h2>{book.title}</h2><p>Halaman {page_num} - Oleh {book.author}</p>',
                    chapter_num=page_num if page_num > 1 else None,
                    chapter_title=f'Bab {page_num}' if page_num > 1 else None
                )
                db.session.add(page)
        db.session.commit()
        return jsonify(success=True, message='✓ 3 buku berhasil ditambahkan!')
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

@app.route('/assets/<path:filename>')
def assets(filename):
    from flask import send_from_directory
    return send_from_directory(os.path.join(app.root_path, 'assets'), filename)


@app.errorhandler(404)
def not_found(e):
    return render_template('LandingPage.html'), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify(success=False, message='Terjadi kesalahan pada server.'), 500


if __name__ == '__main__':
    app.run(debug=True)