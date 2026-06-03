from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
from functools import wraps
import os

# ════════════════════════════════════════════
#  SETUP APLIKASI
# ════════════════════════════════════════════

app = Flask(
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)

# ── Secret Key ────────────────────────────────────────────────────────────────
app.secret_key = os.environ.get('SECRET_KEY', 'GANTI_DENGAN_SECRET_KEY_KAMU_DISINI')

# ── Konfigurasi Database SQLite ───────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'unknownbooks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ── Durasi session "Ingat Saya" ───────────────────────────────────────────────
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

# ── Inisialisasi Database ─────────────────────────────────────────────────────
db = SQLAlchemy(app)


# ════════════════════════════════════════════
#  MODEL DATABASE
# ════════════════════════════════════════════

class User(db.Model):
    """Tabel 'user' di dalam unknownbooks.db"""
    __tablename__ = 'user'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email}>'


# ════════════════════════════════════════════
#  BUAT TABEL
# ════════════════════════════════════════════

with app.app_context():
    db.create_all()


# ════════════════════════════════════════════
#  HELPER — CEK LOGIN & DECORATOR
# ════════════════════════════════════════════

def is_logged_in() -> bool:
    return 'user_email' in session


def login_required(f):
    """Decorator: redirect ke /login jika belum login."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_logged_in():
            return redirect(url_for('auth_page'))
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    """Ambil data user dari session untuk dikirim ke template."""
    return {
        'id':      session.get('user_id'),
        'name':    session.get('user_name', ''),
        'email':   session.get('user_email', ''),
        'initials': ''.join(
            part[0].upper()
            for part in session.get('user_name', 'U').split()[:2]
        )
    }


# ════════════════════════════════════════════
#  HALAMAN PUBLIK
# ════════════════════════════════════════════

@app.route('/')
def landing():
    """Landing Page"""
    return render_template('LandingPage.html', logged_in=is_logged_in())


@app.route('/login', methods=['GET'])
@app.route('/register', methods=['GET'])
def auth_page():
    """Login & Register — auth.html"""
    if is_logged_in():
        return redirect(url_for('dashboard'))
    return render_template('auth.html')


# ════════════════════════════════════════════
#  HALAMAN YANG BUTUH LOGIN
# ════════════════════════════════════════════

@app.route('/dashboard')
@login_required
def dashboard():
    """Dashboard utama setelah login"""
    user = get_current_user()
    return render_template('Dashboard.html', user=user)


@app.route('/detail')
@login_required
def detail():
    """Halaman detail buku — data dari query string"""
    user = get_current_user()
    # Ambil parameter buku dari URL (dikirim oleh dashboard.js)
    book = {
        'cover':  request.args.get('cover',  '/assets/bookShowcase/1.svg'),
        'title':  request.args.get('title',  'Judul Buku'),
        'author': request.args.get('author', 'Unknown'),
        'stars':  request.args.get('stars',  '★★★★★'),
        'rating': request.args.get('rating', '5/5'),
        'badge':  request.args.get('badge',  ''),
        'lang':   request.args.get('lang',   ''),
        'desc':   request.args.get('desc',   'Deskripsi belum tersedia.'),
    }
    return render_template('detail.html', user=user, book=book)


@app.route('/profile')
@login_required
def profile():
    """Halaman profil pengguna"""
    user = get_current_user()
    # Ambil data lengkap dari DB
    db_user = User.query.get(user['id'])
    return render_template('profile.html', user=user, db_user=db_user)


# ════════════════════════════════════════════
#  API AUTENTIKASI — LOGIN
# ════════════════════════════════════════════

@app.route('/auth/login', methods=['POST'])
def auth_login():
    """
    POST /auth/login
    Body JSON : { email, password, remember }
    Response  : { success, message, redirect }
    """
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

    # Simpan ke session
    session.permanent     = remember
    session['user_id']    = user.id
    session['user_email'] = user.email
    session['user_name']  = user.name

    return jsonify(
        success=True,
        message='Login berhasil.',
        redirect=url_for('dashboard')
    ), 200


# ════════════════════════════════════════════
#  API AUTENTIKASI — REGISTER
# ════════════════════════════════════════════

@app.route('/auth/register', methods=['POST'])
def auth_register():
    """
    POST /auth/register
    Body JSON : { name, email, password }
    Response  : { success, message, redirect }
    """
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

    # Auto-login setelah register
    session['user_id']    = new_user.id
    session['user_email'] = new_user.email
    session['user_name']  = new_user.name

    return jsonify(
        success=True,
        message='Akun berhasil dibuat.',
        redirect=url_for('dashboard')
    ), 201


# ════════════════════════════════════════════
#  API AUTENTIKASI — LOGOUT
# ════════════════════════════════════════════

@app.route('/auth/logout', methods=['POST'])
def auth_logout():
    """POST /auth/logout — hapus session, redirect ke landing"""
    session.clear()
    return jsonify(
        success=True,
        message='Logout berhasil.',
        redirect=url_for('landing')
    ), 200


# ════════════════════════════════════════════
#  API USER — CEK STATUS SESSION
# ════════════════════════════════════════════

@app.route('/api/me')
def api_me():
    """
    GET /api/me — cek apakah user sedang login
    Response: { logged_in, user? }
    """
    if not is_logged_in():
        return jsonify(logged_in=False), 200

    return jsonify(
        logged_in=True,
        user={
            'id':       session.get('user_id'),
            'name':     session.get('user_name'),
            'email':    session.get('user_email'),
            'initials': ''.join(
                part[0].upper()
                for part in session.get('user_name', 'U').split()[:2]
            )
        }
    ), 200


# ════════════════════════════════════════════
#  SERVE FOLDER ASSETS
# ════════════════════════════════════════════

@app.route('/assets/<path:filename>')
def assets(filename):
    from flask import send_from_directory
    assets_dir = os.path.join(app.root_path, 'assets')
    return send_from_directory(assets_dir, filename)


# ════════════════════════════════════════════
#  ERROR HANDLERS
# ════════════════════════════════════════════

@app.errorhandler(404)
def not_found(e):
    return render_template('LandingPage.html'), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify(success=False, message='Terjadi kesalahan pada server.'), 500


# ════════════════════════════════════════════
#  RUN
# ════════════════════════════════════════════

if __name__ == '__main__':
    app.run(debug=True)
