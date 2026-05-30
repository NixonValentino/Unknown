from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
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
# Ganti nilai di bawah dengan hasil: python -c "import secrets; print(secrets.token_hex(32))"
app.secret_key = os.environ.get('SECRET_KEY', '4b7ef5902c67c54ed374ddffa40a08513d0bfe71e85a17c807272a731d63f9b4')

# ── Konfigurasi Database SQLite ───────────────────────────────────────────────
# File database akan otomatis dibuat: unknownbooks.db (sejajar dengan app.py)
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
        """Hash dan simpan password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verifikasi password saat login."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email}>'


# ════════════════════════════════════════════
#  BUAT TABEL (jalankan sekali saat start)
# ════════════════════════════════════════════

with app.app_context():
    db.create_all()   # Buat tabel jika belum ada. Aman dijalankan berkali-kali.


# ════════════════════════════════════════════
#  HELPER — CEK LOGIN
# ════════════════════════════════════════════

def is_logged_in() -> bool:
    return 'user_email' in session


# ════════════════════════════════════════════
#  HALAMAN PUBLIK
# ════════════════════════════════════════════

@app.route('/')
def landing():
    """Landing Page — LandingPage.html"""
    return render_template('LandingPage.html')


@app.route('/login', methods=['GET'])
def login_page():
    """Halaman Login — Login.html"""
    if is_logged_in():
        return redirect(url_for('dashboard'))
    return render_template('Login.html')


@app.route('/register', methods=['GET'])
def register_page():
    """Halaman Register — Register.html"""
    if is_logged_in():
        return redirect(url_for('dashboard'))
    return render_template('Register.html')


# ════════════════════════════════════════════
#  HALAMAN YANG BUTUH LOGIN
# ════════════════════════════════════════════

@app.route('/dashboard')
def dashboard():
    """Dashboard — Dashboard.html"""
    if not is_logged_in():
        return redirect(url_for('login_page'))
    return render_template('Dashboard.html', user_name=session.get('user_name'))


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

    # Cari user di database
    user = User.query.filter_by(email=email).first()

    # Pesan generik — tidak membocorkan apakah email terdaftar atau tidak
    if user is None or not user.check_password(password):
        return jsonify(success=False, message='Email atau kata sandi salah.'), 401

    # Simpan ke session Flask
    session.permanent    = remember
    session['user_id']   = user.id
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

    # Validasi
    if not name or not email or not password:
        return jsonify(success=False, message='Semua field wajib diisi.'), 400

    if len(password) < 6:
        return jsonify(success=False, message='Kata sandi minimal 6 karakter.'), 400

    # Cek email sudah terdaftar
    if User.query.filter_by(email=email).first():
        return jsonify(success=False, message='Email sudah terdaftar.'), 409

    # Buat user baru & simpan ke database
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
    """POST /auth/logout — hapus session"""
    session.clear()
    return jsonify(
        success=True,
        message='Logout berhasil.',
        redirect=url_for('landing')
    ), 200


# ════════════════════════════════════════════
#  SERVE FOLDER ASSETS (logo, buku, dll.)
# ════════════════════════════════════════════

@app.route('/assets/<path:filename>')
def assets(filename):
    """Serve file dari folder assets/ yang sejajar dengan app.py"""
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