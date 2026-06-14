# pyrefly: ignore [missing-import]
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import timedelta, datetime
from functools import wraps
from dotenv import load_dotenv
load_dotenv()
import os
import uuid

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)

app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'unknownbooks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB

UPLOAD_FOLDER      = os.path.join(BASE_DIR, 'static', 'uploads', 'covers')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'}

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
    role          = db.Column(db.String(20), default='user')   # 'user' | 'author' | 'admin'
    is_blocked    = db.Column(db.Boolean, default=False)
    # Langganan: None = belum, 'monthly' | 'yearly' = aktif
    subscription_type      = db.Column(db.String(20),  nullable=True)
    subscription_expires   = db.Column(db.DateTime,    nullable=True)

    collections = db.relationship('Collection', backref='user', lazy=True,
                                  cascade='all, delete-orphan')

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


class Collection(db.Model):
    """Koleksi buku yang disimpan oleh user."""
    __tablename__ = 'collection'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    book_id    = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    saved_at   = db.Column(db.DateTime, default=datetime.utcnow)

    book = db.relationship('Book', backref='collected_by')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'book_id', name='uq_user_book'),
    )


# ════════════════════════════════════════════
#  SEED DATA — data buku awal
# ════════════════════════════════════════════

def _seed_books():
    """Isi database dengan data buku + halaman sample. Dipanggil otomatis saat DB kosong."""
    BookPage.query.delete()
    Book.query.delete()
    db.session.commit()

    books_data = [
        {
            'title': 'Fokus Satu Tugas Menuju Produktivitas',
            'author': 'Unknown Books',
            'cover': '/assets/bookShowcase/1.svg',
            'desc': 'Buku ini membahas cara memaksimalkan fokus dengan mengerjakan satu tugas dalam satu waktu untuk mencapai produktivitas maksimal.',
            'rating': '4.9/5 (27 ulasan)',
            'stars': '★★★★★',
            'badge': 'free',
            'lang': 'Indonesia'
        },
        {
            'title': 'Mengendalikan Emosi Primitif',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/6.svg',
            'desc': 'Panduan memahami dan mengendalikan emosi primitif yang sering menghambat cara berpikir jernih di era modern.',
            'rating': '4.8/5 (31 ulasan)',
            'stars': '★★★★★',
            'badge': 'premium',
            'lang': 'Indonesia'
        },
        {
            'title': 'Origin of Human Behavior 101',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/7.svg',
            'desc': 'Eksplorasi mendalam tentang asal-usul perilaku manusia dari sudut pandang ilmu pengetahuan yang mudah dipahami.',
            'rating': '5/5 (24 ulasan)',
            'stars': '★★★★★',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
        {
            'title': 'Learn How to Study With Cake',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/10.svg',
            'desc': 'Metode belajar efektif yang menyenangkan, dirancang agar siapapun bisa belajar lebih cepat dan lebih mudah.',
            'rating': '4.7/5 (18 ulasan)',
            'stars': '★★★★½',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
        {
            'title': 'Jam Karet si Bos',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/3.svg',
            'desc': 'Novel yang menceritakan kehidupan bos dengan jam karetnya yang selalu ia bawa kemana saja.',
            'rating': '4.7/5 (19 ulasan)',
            'stars': '★★★★½',
            'badge': 'free',
            'lang': 'Indonesia'
        },
        {
            'title': 'Malam Trivia',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/5.svg',
            'desc': 'Novel Horror yang menceritakan seorang anak yang bertemu dengan nenek sihir di malam yang sunyi.',
            'rating': '4.7/5 (20 ulasan)',
            'stars': '★★★★½',
            'badge': 'free',
            'lang': 'Indonesia'
        },
        {
            'title': 'Coffe Time',
            'author': 'Unknown Book',
            'cover': '/assets/bookShowcase/9.svg',
            'desc': 'Metode bersosialisasi dengan orang-orang yang berbeda pendapat dan berbeda pandangan dengan kita.',
            'rating': '5/5 (40 ulasan)',
            'stars': '★★★★★',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
        {
            'title': 'Take a Small Steps',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/8.svg',
            'desc': 'Memperbaiki produktivitas dengan melakukan habit-habit kecil yang bermanfaat setiap harinya.',
            'rating': '4.9/5 (15 ulasan)',
            'stars': '★★★★½',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
        {
            'title': 'Seram',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/4.svg',
            'desc': 'Ketika mitos menjadi fenomena yang terjadi secara tiba-tiba di desa palapa.',
            'rating': '4.9/5 (11 ulasan)',
            'stars': '★★★★½',
            'badge': 'free',
            'lang': 'Indonesia'
        },
        {
            'title': 'The Winner Mentality',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/6.svg',
            'desc': 'Mengetahui mental pemenang di dalam diri anda dan cara mengaktifkannya dalam kehidupan sehari-hari.',
            'rating': '4.9/5 (15 ulasan)',
            'stars': '★★★★★',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
        {
            'title': 'Its Party Time',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/2.svg',
            'desc': 'Belajar bagaimana membangun bisnis dengan metode party time yang menyenangkan namun tetap produktif.',
            'rating': '4.9/5 (15 ulasan)',
            'stars': '★★★★½',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
        {
            'title': 'The Coffe Shop',
            'author': 'Unknown',
            'cover': '/assets/bookShowcase/11.svg',
            'desc': 'Cerita mengenai toko kopi di pinggiran kota yang menjadi saksi bisu berbagai kisah kehidupan.',
            'rating': '4.9/5 (20 ulasan)',
            'stars': '★★★★½',
            'badge': 'premium',
            'lang': '🇺🇸 English'
        },
    ]

    sample_pages = [
        {'type': 'cover',   'content': '', 'chapter_num': None, 'chapter_title': None},
        {'type': 'blank',   'content': '', 'chapter_num': None, 'chapter_title': None},
        {'type': 'chapter', 'content': '', 'chapter_num': 1,    'chapter_title': 'Pendahuluan'},
        {
            'type': 'text',
            'content': '<p>Selamat datang di perjalanan membaca yang luar biasa ini. Setiap halaman yang Anda baca adalah langkah maju menuju pemahaman yang lebih dalam.</p><p>Buku ini dirancang untuk memberikan wawasan berharga yang dapat langsung diterapkan dalam kehidupan sehari-hari. Mulailah dengan pikiran terbuka dan nikmati setiap kata yang tersaji.</p><p>Perjalanan seribu mil dimulai dengan satu langkah. Dan langkah pertama Anda dimulai dari sini, dari halaman ini, dari saat ini juga.</p>',
            'chapter_num': None, 'chapter_title': None,
        },
        {
            'type': 'text',
            'content': '<p>Dalam bab pertama ini, kita akan menjelajahi konsep-konsep dasar yang menjadi fondasi dari seluruh buku ini. Pemahaman yang kuat di sini akan memudahkan Anda memahami bab-bab berikutnya.</p><p>Para peneliti telah membuktikan bahwa pemahaman mendalam hanya bisa dicapai melalui keterlibatan aktif dengan materi. Jangan hanya membaca — renungkan, pertanyakan, dan hubungkan dengan pengalaman Anda sendiri.</p>',
            'chapter_num': None, 'chapter_title': None,
        },
        {'type': 'chapter', 'content': '', 'chapter_num': 2, 'chapter_title': 'Inti Pembahasan'},
        {
            'type': 'text',
            'content': '<p>Di sinilah inti dari semua yang ingin disampaikan buku ini. Setiap ide yang akan Anda temukan di bab ini telah melalui penelitian dan pengujian yang panjang.</p><p>Konsep utama yang perlu dipahami adalah bahwa perubahan sejati selalu dimulai dari dalam diri. Tidak ada formula ajaib dari luar yang bisa menggantikan kerja keras dan komitmen internal.</p><p>Dengan memahami prinsip ini, Anda akan mampu mengaplikasikan semua teknik dalam buku ini dengan jauh lebih efektif.</p>',
            'chapter_num': None, 'chapter_title': None,
        },
        {
            'type': 'text',
            'content': '<p>Langkah selanjutnya adalah implementasi. Banyak orang yang membaca buku tetapi tidak mengambil tindakan nyata. Jangan jadikan buku ini sekadar koleksi — jadikan ia panduan hidup.</p><p>Buatlah catatan, tandai bagian yang penting, dan yang paling utama: praktikkan apa yang Anda pelajari mulai hari ini. Bukan besok, bukan minggu depan, tapi sekarang.</p>',
            'chapter_num': None, 'chapter_title': None,
        },
        {'type': 'chapter', 'content': '', 'chapter_num': 3, 'chapter_title': 'Kesimpulan & Refleksi'},
        {
            'type': 'text',
            'content': '<p>Kita telah sampai di penghujung perjalanan ini. Semoga setiap halaman yang Anda baca telah memberikan nilai tambah yang nyata bagi kehidupan Anda.</p><p>Ingatlah bahwa membaca adalah investasi terbaik yang bisa Anda lakukan untuk diri sendiri. Setiap buku yang Anda selesaikan adalah satu level baru dalam perjalanan pertumbuhan pribadi Anda.</p><p>Terima kasih telah meluangkan waktu bersama buku ini. Sampai jumpa di buku berikutnya!</p>',
            'chapter_num': None, 'chapter_title': None,
        },
        {'type': 'blank', 'content': '', 'chapter_num': None, 'chapter_title': None},
    ]

    for book_data in books_data:
        book = Book(**book_data)
        db.session.add(book)
        db.session.flush()
        for i, page_data in enumerate(sample_pages):
            page = BookPage(
                book_id=book.id,
                page_number=i + 1,
                page_type=page_data['type'],
                content=page_data['content'],
                chapter_num=page_data['chapter_num'],
                chapter_title=page_data['chapter_title'],
            )
            db.session.add(page)

    db.session.commit()


def _seed_roles():
    """Seed 3 akun admin dan 1 akun penulis jika belum ada."""
    accounts = [
        {'name': 'Admin 1',              'email': 'admin1@unknownbooks.id',  'password': 'Admin@123',    'role': 'admin'},
        {'name': 'Admin 2',              'email': 'admin2@unknownbooks.id',  'password': 'Admin@456',    'role': 'admin'},
        {'name': 'Admin 3',              'email': 'admin3@unknownbooks.id',  'password': 'Admin@789',    'role': 'admin'},
        {'name': 'Penulis UnknownBooks', 'email': 'penulis@unknownbooks.id', 'password': 'Penulis@123',  'role': 'author'},
    ]
    changed = False
    for acc in accounts:
        if not User.query.filter_by(email=acc['email']).first():
            u = User(name=acc['name'], email=acc['email'], role=acc['role'])
            u.set_password(acc['password'])
            db.session.add(u)
            changed = True
    if changed:
        db.session.commit()


with app.app_context():
    db.create_all()
    # Auto-seed jika database kosong
    if Book.query.count() == 0:
        _seed_books()
    # Selalu pastikan akun admin & penulis ada
    _seed_roles()


# ════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def is_logged_in() -> bool:
    return 'user_email' in session


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_logged_in():
            return redirect(url_for('auth_page'))
        return f(*args, **kwargs)
    return decorated


def author_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_logged_in():
            return redirect(url_for('auth_page'))
        if session.get('user_role') != 'author':
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_logged_in():
            return redirect(url_for('auth_page'))
        if session.get('user_role') != 'admin':
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    return {
        'id':       session.get('user_id'),
        'name':     session.get('user_name', ''),
        'email':    session.get('user_email', ''),
        'role':     session.get('user_role', 'user'),
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
    return db.session.get(User, uid)


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
        role = session.get('user_role', 'user')
        if role == 'admin':
            return redirect(url_for('admin_page'))
        return redirect(url_for('dashboard'))
    return render_template('Auth.html')


# ════════════════════════════════════════════
#  HALAMAN LOGIN REQUIRED
# ════════════════════════════════════════════

@app.route('/dashboard')
@login_required
def dashboard():
    role = session.get('user_role', 'user')
    if role == 'admin':
        return redirect(url_for('admin_page'))
    user    = get_current_user()
    db_user = get_db_user()
    books   = Book.query.all()
    return render_template('Dashboard.html', user=user, db_user=db_user, books=books)


@app.route('/detail')
@login_required
def detail():
    user    = get_current_user()
    db_user = get_db_user()
    book_id = request.args.get('id', '0')
    title   = request.args.get('title', '')

    db_book = db.session.get(Book, int(book_id)) if book_id.isdigit() and int(book_id) > 0 else None
    if not db_book and title:
        db_book = Book.query.filter_by(title=title).first()

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
        is_saved = db_user and Collection.query.filter_by(
            user_id=db_user.id, book_id=db_book.id
        ).first() is not None
    else:
        book = {
            'id':     0,
            'cover':  request.args.get('cover',  '/assets/bookShowcase/1.svg'),
            'title':  request.args.get('title',  'Judul Buku'),
            'author': request.args.get('author', 'Unknown'),
            'stars':  request.args.get('stars',  '★★★★★'),
            'rating': request.args.get('rating', '5/5'),
            'badge':  request.args.get('badge',  'free'),
            'lang':   request.args.get('lang',   ''),
            'desc':   request.args.get('desc',   'Deskripsi belum tersedia.'),
        }
        is_saved = False

    user_is_premium = db_user.is_premium if db_user else False
    is_author = db_user and db_user.role == 'author' and book['author'] == db_user.name

    return render_template('detail.html', user=user, book=book,
                           is_premium=user_is_premium, db_user=db_user,
                           is_saved=is_saved, is_author=is_author)


@app.route('/profile')
@login_required
def profile():
    user    = get_current_user()
    db_user = get_db_user()
    saved_books = []
    if db_user:
        for col in db_user.collections:
            b = col.book
            saved_books.append({
                'id':     b.id,
                'title':  b.title,
                'author': b.author,
                'cover':  b.cover,
                'badge':  b.badge,
                'stars':  b.stars,
                'rating': b.rating,
                'lang':   b.lang,
                'desc':   b.desc,
            })
    return render_template('profile.html', user=user, db_user=db_user,
                           saved_books=saved_books)


# ════════════════════════════════════════════
#  ADMIN HALAMAN
# ════════════════════════════════════════════

@app.route('/admin')
@admin_required
def admin_page():
    user    = get_current_user()
    db_user = get_db_user()

    total_users   = User.query.filter_by(role='user').count()
    total_authors = User.query.filter_by(role='author').count()
    total_books   = Book.query.count()
    total_blocked = User.query.filter_by(is_blocked=True).count()

    stats = {
        'total_users':   total_users,
        'total_authors': total_authors,
        'total_books':   total_books,
        'total_blocked': total_blocked,
    }

    return render_template('Admin.html', user=user, db_user=db_user, stats=stats)


# ════════════════════════════════════════════
#  READER — cek akses premium
# ════════════════════════════════════════════

@app.route('/read/<int:book_id>')
@login_required
def reader(book_id):
    db_user = get_db_user()
    book    = db.session.get(Book, book_id)
    if book is None:
        return redirect(url_for('dashboard'))

    if book.badge == 'premium' and (not db_user or not db_user.is_premium):
        return redirect(url_for('subscribe', next=f'/read/{book_id}'))

    return render_template('Reader.html', book=book, book_id=book_id, db_user=db_user)


# ════════════════════════════════════════════
#  SUBSCRIBE — halaman langganan
# ════════════════════════════════════════════

@app.route('/subscribe')
@login_required
def subscribe():
    # Penulis dan admin tidak bisa subscribe
    role = session.get('user_role', 'user')
    if role in ('author', 'admin'):
        return redirect(url_for('dashboard'))

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
    return render_template('Subscribe.html',
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
    role = session.get('user_role', 'user')
    if role in ('author', 'admin'):
        return jsonify(success=False, message='Fitur ini tidak tersedia untuk role Anda.'), 403

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

    session['subscription_type'] = db_user.subscription_type

    next_url = data.get('next') or '/dashboard'

    return jsonify(
        success=True,
        message=f'Langganan {plan} berhasil diaktifkan!',
        expires=db_user.subscription_expires.strftime('%d %B %Y'),
        redirect=next_url
    ), 200


# ════════════════════════════════════════════
#  API — KOLEKSI BUKU (SIMPAN / HAPUS)
# ════════════════════════════════════════════

@app.route('/api/collection/toggle', methods=['POST'])
@login_required
def api_collection_toggle():
    data = request.get_json(silent=True)
    if not data:
        return jsonify(success=False, message='Data tidak valid.'), 400

    book_id = data.get('book_id')
    if not book_id:
        return jsonify(success=False, message='book_id diperlukan.'), 400

    db_user = get_db_user()
    if not db_user:
        return jsonify(success=False, message='User tidak ditemukan.'), 404

    book = db.session.get(Book, book_id)
    if not book:
        return jsonify(success=False, message='Buku tidak ditemukan.'), 404

    existing = Collection.query.filter_by(
        user_id=db_user.id, book_id=book_id
    ).first()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify(success=True, saved=False,
                       message=f'"{book.title}" dihapus dari koleksi.'), 200
    else:
        col = Collection(user_id=db_user.id, book_id=book_id)
        db.session.add(col)
        db.session.commit()
        return jsonify(success=True, saved=True,
                       message=f'"{book.title}" disimpan ke koleksi.'), 200


@app.route('/api/collection')
@login_required
def api_collection():
    db_user = get_db_user()
    if not db_user:
        return jsonify(success=False, message='User tidak ditemukan.'), 404

    books = []
    for col in db_user.collections:
        b = col.book
        books.append({
            'id':     b.id,
            'title':  b.title,
            'author': b.author,
            'cover':  b.cover,
            'badge':  b.badge,
            'stars':  b.stars,
            'rating': b.rating,
            'lang':   b.lang,
            'desc':   b.desc,
            'saved_at': col.saved_at.strftime('%d %B %Y'),
        })

    return jsonify(success=True, count=len(books), books=books), 200


# ════════════════════════════════════════════
#  API — KONTEN HALAMAN BUKU
# ════════════════════════════════════════════

@app.route('/api/book/<int:book_id>/pages')
@login_required
def api_book_pages(book_id):
    db_user = get_db_user()
    book    = db.session.get(Book, book_id)
    if not book:
        return jsonify(success=False, message='Buku tidak ditemukan.'), 404

    if book.badge == 'premium' and (not db_user or not db_user.is_premium):
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
            'role':       session.get('user_role', 'user'),
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
#  API — UBAH PASSWORD
# ════════════════════════════════════════════

@app.route('/api/user/change-password', methods=['POST'])
@login_required
def api_change_password():
    data = request.get_json()
    if not data:
        return jsonify(success=False, message="Data tidak valid"), 400

    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify(success=False, message="Password lama dan baru wajib diisi"), 400

    db_user = get_db_user()
    if not db_user:
        return jsonify(success=False, message="User tidak ditemukan"), 404

    # Verifikasi password lama
    if not check_password_hash(db_user.password_hash, old_password):
        return jsonify(success=False, message="Password lama salah"), 400

    # Validasi panjang password baru
    if len(new_password) < 6:
        return jsonify(success=False, message="Password baru minimal 6 karakter"), 400

    # Simpan password baru
    db_user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify(success=True, message="Password berhasil diubah"), 200

# ════════════════════════════════════════════
#  API — TAMBAH BUKU (AUTHOR ONLY)
# ════════════════════════════════════════════

@app.route('/api/book/add', methods=['POST'])
@login_required
def api_add_book():
    if session.get('user_role') != 'author':
        return jsonify(success=False, message='Akses ditolak. Hanya penulis yang dapat menambah buku.'), 403

    title = (request.form.get('title') or '').strip()
    desc  = (request.form.get('desc')  or '').strip()
    content = (request.form.get('content') or '').strip()
    badge = request.form.get('badge', 'free')
    lang  = (request.form.get('lang') or 'Indonesia').strip()

    if badge not in ('free', 'premium'):
        badge = 'free'

    if not title:
        return jsonify(success=False, message='Judul buku wajib diisi.'), 400

    db_user     = get_db_user()
    author_name = db_user.name if db_user else 'Unknown'

    # Handle cover upload
    cover_path = '/assets/bookShowcase/1.svg'
    cover_file = request.files.get('cover')
    if cover_file and cover_file.filename and allowed_file(cover_file.filename):
        ext      = cover_file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        cover_file.save(os.path.join(UPLOAD_FOLDER, filename))
        cover_path = f'/static/uploads/covers/{filename}'

    new_book = Book(
        title=title,
        author=author_name,
        cover=cover_path,
        desc=desc,
        rating='5/5',
        stars='★★★★★',
        badge=badge,
        lang=lang,
    )
    db.session.add(new_book)
    db.session.flush()

    # Tambah halaman sample minimal
    sample = [
        {'type': 'cover',   'content': '',           'chapter_num': None, 'chapter_title': None},
        {'type': 'blank',   'content': '',           'chapter_num': None, 'chapter_title': None},
        {'type': 'chapter', 'content': '',           'chapter_num': 1,    'chapter_title': 'Pendahuluan'},
        {'type': 'text',    'content': f'<p>{content}</p>' if content else (f'<p>{desc}</p>' if desc else '<p>Konten buku belum tersedia.</p>'),
                                                      'chapter_num': None, 'chapter_title': None},
        {'type': 'blank',   'content': '',           'chapter_num': None, 'chapter_title': None},
    ]
    for i, p in enumerate(sample):
        db.session.add(BookPage(
            book_id=new_book.id,
            page_number=i + 1,
            page_type=p['type'],
            content=p['content'],
            chapter_num=p['chapter_num'],
            chapter_title=p['chapter_title'],
        ))

    db.session.commit()

    return jsonify(
        success=True,
        message=f'Buku "{title}" berhasil ditambahkan!',
        book={
            'id':     new_book.id,
            'title':  new_book.title,
            'author': new_book.author,
            'cover':  new_book.cover,
            'badge':  new_book.badge,
            'lang':   new_book.lang,
            'desc':   new_book.desc,
            'stars':  new_book.stars,
            'rating': new_book.rating,
        }
    ), 201


@app.route('/api/book/delete/<int:book_id>', methods=['POST'])
@login_required
def api_delete_book(book_id):
    if session.get('user_role') != 'author':
        return jsonify(success=False, message='Akses ditolak. Hanya penulis yang dapat menghapus buku.'), 403

    db_user = get_db_user()
    book = db.session.get(Book, book_id)
    if not book:
        return jsonify(success=False, message='Buku tidak ditemukan.'), 404

    # Pastikan buku ini dibuat oleh penulis yang sedang login
    if book.author != db_user.name:
        return jsonify(success=False, message='Anda tidak memiliki izin untuk menghapus buku ini.'), 403

    # Hapus semua data yang berhubungan (pages dan collections) untuk menghindari integritas data error
    BookPage.query.filter_by(book_id=book.id).delete()
    Collection.query.filter_by(book_id=book.id).delete()

    db.session.delete(book)
    db.session.commit()

    return jsonify(success=True, message=f'Buku "{book.title}" berhasil dihapus.'), 200


# ════════════════════════════════════════════
#  API — ADMIN: KELOLA USER
# ════════════════════════════════════════════

@app.route('/api/admin/users')
@login_required
def api_admin_users():
    if session.get('user_role') != 'admin':
        return jsonify(success=False, message='Akses ditolak.'), 403

    users = User.query.filter(User.role != 'admin').order_by(User.id).all()
    return jsonify(
        success=True,
        users=[{
            'id':         u.id,
            'name':       u.name,
            'email':      u.email,
            'role':       u.role,
            'is_blocked': u.is_blocked,
            'is_premium': u.is_premium,
        } for u in users]
    ), 200


@app.route('/api/admin/stats')
@login_required
def api_admin_stats():
    if session.get('user_role') != 'admin':
        return jsonify(success=False, message='Akses ditolak.'), 403

    return jsonify(
        success=True,
        stats={
            'total_users':   User.query.filter_by(role='user').count(),
            'total_authors': User.query.filter_by(role='author').count(),
            'total_books':   Book.query.count(),
            'total_blocked': User.query.filter_by(is_blocked=True).count(),
        }
    ), 200


@app.route('/api/admin/block/<int:user_id>', methods=['POST'])
@login_required
def api_admin_block(user_id):
    if session.get('user_role') != 'admin':
        return jsonify(success=False, message='Akses ditolak.'), 403

    u = db.session.get(User, user_id)
    if not u:
        return jsonify(success=False, message='User tidak ditemukan.'), 404
    if u.role == 'admin':
        return jsonify(success=False, message='Tidak dapat memblokir sesama admin.'), 403

    u.is_blocked = True
    db.session.commit()
    return jsonify(success=True, message=f'User "{u.name}" berhasil diblokir.'), 200


@app.route('/api/admin/unblock/<int:user_id>', methods=['POST'])
@login_required
def api_admin_unblock(user_id):
    if session.get('user_role') != 'admin':
        return jsonify(success=False, message='Akses ditolak.'), 403

    u = db.session.get(User, user_id)
    if not u:
        return jsonify(success=False, message='User tidak ditemukan.'), 404

    u.is_blocked = False
    db.session.commit()
    return jsonify(success=True, message=f'User "{u.name}" berhasil dibuka blokirnya.'), 200


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

    if user.is_blocked:
        return jsonify(
            success=False,
            message='Akun Anda telah diblokir. Hubungi administrator untuk informasi lebih lanjut.'
        ), 403

    session.permanent     = remember
    session['user_id']    = user.id
    session['user_email'] = user.email
    session['user_name']  = user.name
    session['user_role']  = user.role

    redirect_url = url_for('admin_page') if user.role == 'admin' else url_for('dashboard')

    return jsonify(success=True, message='Login berhasil.', redirect=redirect_url), 200


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

    new_user = User(name=name, email=email, role='user')
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    session['user_id']    = new_user.id
    session['user_email'] = new_user.email
    session['user_name']  = new_user.name
    session['user_role']  = new_user.role

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

@app.route('/assets/<path:filename>')
def assets(filename):
    from flask import send_from_directory
    return send_from_directory(os.path.join(app.root_path, 'assets'), filename)


@app.route('/seed-db')
def seed_db():
    """Populate ulang database dengan sample data buku + halaman."""
    try:
        _seed_books()
        return jsonify(success=True, message='✓ 12 buku berhasil ditambahkan dengan konten lengkap!')
    except Exception as e:
        db.session.rollback()
        return jsonify(success=False, message=str(e)), 500


@app.errorhandler(404)
def not_found(e):
    return render_template('LandingPage.html'), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify(success=False, message='Terjadi kesalahan pada server.'), 500


if __name__ == '__main__':
    app.run(debug=True)