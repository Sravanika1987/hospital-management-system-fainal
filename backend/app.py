from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False) # In a real app, hash passwords!
    role = db.Column(db.String(80), nullable=False) # 'admin', 'receptionist', 'doctor'

    def __repr__(self):
        return f'<User {self.username}>'

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    date = db.Column(db.String(20), nullable=False) # Booking date
    problem = db.Column(db.String(200), nullable=False)
    visited = db.Column(db.String(10), nullable=False) # "Yes" or "No"
    category = db.Column(db.String(80), nullable=True) # Assigned by receptionist
    medication = db.Column(db.String(500), nullable=True) # Prescribed by doctor
    status = db.Column(db.String(20), default='pending', nullable=False) # 'pending', 'accepted', 'deleted'

    def __repr__(self):
        return f'<Patient {self.name}>'

# --- Routes ---

# Test route
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Welcome to the Hospital Appointment System Backend!"})

# Run the app
if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Create database tables if they don't exist
        # Add default admin user if not exists
        if not User.query.filter_by(username='A100').first():
            admin_user = User(username='A100', password='sravanika', role='admin')
            db.session.add(admin_user)
            db.session.commit()
            print("Default admin user 'A100' created.")
    app.run(debug=True, port=5000)
