"""
SHIKSHA SHIELD – Flask Backend
AI Risk Intelligence System for Preventing Girl Child Dropout
"""
import sqlite3
import os
import json
import math
import random
import hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'shiksha-shield-secret-2024'

DB_PATH = os.path.join(os.path.dirname(__file__), 'shiksha_shield.db')

# ─── Database Helpers ───────────────────────────────────────────────
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('teacher','school_admin','district_officer','state_officer')),
            school_id INTEGER,
            district_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS districts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            state TEXT DEFAULT 'Madhya Pradesh'
        );
        CREATE TABLE IF NOT EXISTS schools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            district_id INTEGER,
            village TEXT,
            FOREIGN KEY(district_id) REFERENCES districts(id)
        );
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_uid TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            school_id INTEGER NOT NULL,
            class INTEGER DEFAULT 6,
            attendance REAL DEFAULT 0,
            academic_score REAL DEFAULT 0,
            menstrual_absence INTEGER DEFAULT 0,
            income_band TEXT DEFAULT 'low',
            migration_flag INTEGER DEFAULT 0,
            marriage_risk_flag INTEGER DEFAULT 0,
            
            -- Comprehensive Parameters
            application_mode TEXT,
            application_order INTEGER,
            daytime_evening INTEGER,
            prev_qualification TEXT,
            prev_qualification_grade REAL,
            nacionality TEXT,
            mothers_qualification TEXT,
            fathers_qualification TEXT,
            mothers_occupation TEXT,
            fathers_occupation TEXT,
            admission_grade REAL,
            displaced INTEGER,
            educational_special_needs INTEGER,
            debtor INTEGER,
            tuition_fees_up_to_date INTEGER,
            gender TEXT DEFAULT 'Female',
            scholarship_holder INTEGER,
            age_at_enrollment INTEGER,
            international INTEGER,
            curricular_units_credited INTEGER DEFAULT 0,
            curricular_units_enrolled INTEGER DEFAULT 0,
            curricular_units_evaluations INTEGER DEFAULT 0,
            curricular_units_approved INTEGER DEFAULT 0,
            curricular_units_grade REAL DEFAULT 0,
            curricular_units_without_evaluations INTEGER DEFAULT 0,
            inflation_rate REAL,
            
            -- Specific requested parameters
            school_distance REAL,
            sibling_count INTEGER,
            age_grade_mismatch INTEGER,
            health_condition TEXT,
            institution_issues TEXT,
            eve_teasing INTEGER DEFAULT 0,
            abuse INTEGER DEFAULT 0,
            remarks TEXT,
            
            risk_score REAL DEFAULT 0,
            risk_category TEXT DEFAULT 'Low',
            cause TEXT DEFAULT '',
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(school_id) REFERENCES schools(id)
        );
        CREATE TABLE IF NOT EXISTS interventions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            cause_type TEXT NOT NULL,
            action_taken TEXT NOT NULL,
            officer_id INTEGER,
            follow_up_status TEXT DEFAULT 'pending',
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            risk_score_before REAL DEFAULT 0,
            risk_score_after REAL,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            student_id INTEGER,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    db.commit()

    # Check if data already seeded
    count = db.execute('SELECT COUNT(*) FROM students').fetchone()[0]
    if count == 0:
        seed_data(db)
    db.close()


# ─── Variables for ML Model Support ─────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'dropout_model.pkl')
import warnings
warnings.filterwarnings("ignore", message="X does not have valid feature names")

_ml_model = None

def get_ml_model():
    global _ml_model
    if _ml_model is None:
        try:
            if os.path.exists(MODEL_PATH):
                _ml_model = joblib.load(MODEL_PATH)
        except Exception as e:
            # print(f"Warning: Could not load ML model: {e}")
            _ml_model = None
    return _ml_model


# ─── AI Risk Engine ─────────────────────────────────────────────────
def calculate_risk_score(data):
    """
    Uses expanded features to calculate risk probability.
    data: dict containing all student features
    """
    model = get_ml_model()
    
    # Extract common features
    attendance = float(data.get('attendance', 100))
    academic_score = float(data.get('academic_score', 0))
    menstrual_absence = int(data.get('menstrual_absence', 0))
    income_band = data.get('income_band', 'medium')
    migration_flag = int(data.get('migration_flag', 0))
    marriage_risk_flag = int(data.get('marriage_risk_flag', 0))
    
    # New features
    tuition_up_to_date = int(data.get('tuition_fees_up_to_date', 1))
    scholarship = int(data.get('scholarship_holder', 0))
    debtor = int(data.get('debtor', 0))
    age_grade_mismatch = int(data.get('age_grade_mismatch', 0))
    eve_teasing = int(data.get('eve_teasing', 0))
    abuse = int(data.get('abuse', 0))
    school_distance = float(data.get('school_distance', 1))
    
    # Heuristic-based contribution weights (simulating a complex model)
    score = 0
    
    # 1. Academic & Attendance (40%)
    score += (100 - attendance) * 0.25
    score += (100 - academic_score) * 0.15
    
    # 2. Financial (20%)
    income_map = {'high': 0, 'medium': 5, 'low': 15, 'below_poverty': 25}
    score += income_map.get(income_band, 10)
    if not tuition_up_to_date: score += 15
    if debtor: score += 10
    if scholarship: score -= 10 # Scholarship is a protective factor
    
    # 3. Social & Health (20%)
    score += min(menstrual_absence * 5, 20)
    if marriage_risk_flag: score += 25
    if migration_flag: score += 15
    if eve_teasing: score += 10
    if abuse: score += 20
    
    # 4. Institutional & Misc (20%)
    score += min(school_distance * 2, 10)
    if age_grade_mismatch: score += 10
    
    # Normalize score to 0-100
    score = min(max(round(score, 1), 0), 100)

    # Classification bounds
    if score <= 30:
        category = 'Low'
    elif score <= 50:
        category = 'Moderate'
    elif score <= 75:
        category = 'High'
    else:
        category = 'Critical'

    # Determine primary cause
    factors = {
        'Low Attendance': (100 - attendance) * 0.25,
        'Poor Academics': (100 - academic_score) * 0.15,
        'Financial Hardship': income_map.get(income_band, 10) + (15 if not tuition_up_to_date else 0) + (10 if debtor else 0),
        'Social/Safety Risks': (25 if marriage_risk_flag else 0) + (10 if eve_teasing else 0) + (20 if abuse else 0),
        'Health/Menstrual Issues': min(menstrual_absence * 5, 20),
        'Migration Risk': migration_flag * 15
    }
    sorted_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)
    primary_cause = sorted_factors[0][0]
    top_3 = [{'factor': f[0], 'contribution': round(f[1], 1)} for f in sorted_factors[:3]]

    return {
        'risk_score': score,
        'risk_category': category,
        'cause': primary_cause,
        'top_factors': top_3,
        'explanation': f"Primary risk driver: {primary_cause}. "
                       f"Top factors: {', '.join(f[0] for f in sorted_factors[:3])}."
    }


def get_intervention_suggestions(cause):
    """Return intervention suggestions based on cause type."""
    suggestions = {
        'Financial Hardship': {
            'schemes': ['Sukanya Samriddhi Yojana', 'PM CARES for Children', 'State Merit Scholarship'],
            'actions': ['Apply for scholarship', 'Provide hostel accommodation', 'Connect with NGO support'],
            'contacts': 'District Education Officer: 1800-XXX-XXXX'
        },
        'Health/Menstrual Issues': {
            'schemes': ['Free Sanitary Pad Distribution Scheme', 'School Health Programme'],
            'actions': ['Notify ASHA worker', 'Ensure sanitary pad access', 'Health check-up referral'],
            'contacts': 'ASHA Worker Helpline: 104'
        },
        'Social/Safety Risks': {
            'schemes': ['Child Marriage Prohibition Act enforcement', 'Beti Bachao Beti Padhao'],
            'actions': ['Alert District Child Protection Officer', 'Police feedback on eve-teasing', 'Safety counselling'],
            'contacts': 'CHILDLINE: 1098'
        },
        'Child Marriage Risk': {
            'schemes': ['Child Marriage Prohibition Act 2006 enforcement'],
            'actions': ['Alert District Child Protection Officer', 'File confidential report', 'Conduct family counselling'],
            'contacts': 'DCPO Emergency: 1098'
        },
        'Low Attendance': {
            'schemes': ['Mid-Day Meal Scheme enhancement', 'School transport facility'],
            'actions': ['Home visit by teacher', 'Parent-teacher meeting'],
            'contacts': 'Block Education Officer'
        },
        'Poor Academics': {
            'schemes': ['Remedial teaching programme', 'Bridge course enrolment'],
            'actions': ['Assign student mentor', 'Extra tuition support'],
            'contacts': 'Academic Coordinator'
        },
        'Migration Risk': {
            'schemes': ['Seasonal hostel facility', 'Mobile school programme'],
            'actions': ['Track migration pattern', 'Register at destination school'],
            'contacts': 'Migration Cell'
        }
    }
    return suggestions.get(cause, suggestions['Low Attendance'])


# ─── Seed Data ──────────────────────────────────────────────────────
def seed_data(db):
    """Generate 1000 simulated student records with realistic distributions."""
    random.seed(42)

    # Districts
    district_names = ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain',
                      'Sagar', 'Rewa', 'Satna', 'Chhindwara', 'Balaghat']
    for d in district_names:
        db.execute('INSERT INTO districts (name) VALUES (?)', (d,))

    # Schools (5 per district = 50 schools)
    school_id = 1
    villages = ['Rampur', 'Sultanpur', 'Khandwa', 'Dewas', 'Mandla',
                'Betul', 'Seoni', 'Dhar', 'Barwani', 'Jhabua',
                'Shivpuri', 'Tikamgarh', 'Panna', 'Damoh', 'Katni']
    for d_id in range(1, 11):
        for s in range(5):
            village = random.choice(villages)
            db.execute('INSERT INTO schools (name, district_id, village) VALUES (?, ?, ?)',
                      (f'Govt. Girls School {school_id}', d_id, village))
            school_id += 1
    db.commit()

    # Users
    pwd_hash = hashlib.sha256('demo123'.encode()).hexdigest()
    users_data = [
        ('teacher1', pwd_hash, 'Priya Sharma', 'teacher', 1, 1),
        ('teacher2', pwd_hash, 'Anita Verma', 'teacher', 2, 1),
        ('schooladmin1', pwd_hash, 'Rajesh Kumar', 'school_admin', 1, 1),
        ('district1', pwd_hash, 'Dr. Suresh Patel', 'district_officer', None, 1),
        ('district2', pwd_hash, 'Meena Agarwal', 'district_officer', None, 2),
        ('state1', pwd_hash, 'Commissioner Singh', 'state_officer', None, None),
    ]
    for u in users_data:
        db.execute('INSERT INTO users (username, password_hash, name, role, school_id, district_id) VALUES (?,?,?,?,?,?)', u)
    db.commit()

    # Students - 1000 records with target: 18% baseline dropout risk
    income_bands = ['high', 'medium', 'low', 'below_poverty']
    income_weights = [0.05, 0.25, 0.45, 0.25]
    classes = [6, 7, 8, 9, 10, 11, 12]
    class_weights = [0.2, 0.18, 0.16, 0.15, 0.13, 0.1, 0.08]
    occupations = ['Farmer', 'Labourer', 'Teacher', 'Clerk', 'Shopkeeper', 'Unemployed']

    for i in range(1, 1001):
        s_id = random.randint(1, 50)
        cls = random.choices(classes, weights=class_weights, k=1)[0]
        income = random.choices(income_bands, weights=income_weights, k=1)[0]

        # Generate correlated features
        base_attendance = random.gauss(78, 18)
        base_academic = random.gauss(62, 22)

        if income in ['below_poverty', 'low']:
            base_attendance -= random.uniform(5, 15)
            base_academic -= random.uniform(5, 10)

        attendance = round(max(20, min(100, base_attendance)), 1)
        academic = round(max(10, min(100, base_academic)), 1)
        menstrual_abs = max(0, int(random.gauss(2, 3))) if cls >= 8 else 0
        migration = 1 if random.random() < 0.12 else 0
        marriage = 1 if (random.random() < 0.08 and cls >= 9) else 0

        if income == 'below_poverty' and random.random() < 0.3:
            marriage = 1
        if migration:
            attendance = max(20, attendance - random.uniform(10, 25))

        attendance = round(max(20, min(100, attendance)), 1)
        academic = round(max(10, min(100, academic)), 1)

        # Extensive features
        student_data = {
            'attendance': attendance,
            'academic_score': academic,
            'menstrual_absence': menstrual_abs,
            'income_band': income,
            'migration_flag': migration,
            'marriage_risk_flag': marriage,
            'application_mode': random.choice(['online', 'offline']),
            'application_order': random.randint(1, 5),
            'daytime_evening': random.choice([0, 1]),
            'prev_qualification': random.choice(['10th Pass', '12th Pass']),
            'prev_qualification_grade': round(random.uniform(50, 90), 1),
            'nacionality': 'Indian',
            'mothers_qualification': random.choice(['Illiterate', 'Primary', 'Secondary', 'Higher']),
            'fathers_qualification': random.choice(['Illiterate', 'Primary', 'Secondary', 'Higher']),
            'mothers_occupation': random.choice(occupations),
            'fathers_occupation': random.choice(occupations),
            'admission_grade': round(random.uniform(50, 90), 1),
            'displaced': random.choice([0, 1]),
            'educational_special_needs': random.choice([0, 1]),
            'debtor': 1 if random.random() < 0.1 else 0,
            'tuition_fees_up_to_date': 1 if random.random() > 0.15 else 0,
            'gender': 'Female',
            'scholarship_holder': 1 if random.random() < 0.2 else 0,
            'age_at_enrollment': cls + random.randint(5, 7), # Simulate age based on class
            'international': 0,
            'curricular_units_credited': random.randint(0, 5),
            'curricular_units_enrolled': random.randint(10, 20),
            'curricular_units_evaluations': random.randint(5, 15),
            'curricular_units_approved': random.randint(5, 15),
            'curricular_units_grade': round(random.uniform(10, 18), 1),
            'curricular_units_without_evaluations': random.randint(0, 3),
            'inflation_rate': round(random.uniform(4, 8), 1),
            'school_distance': round(random.uniform(0.5, 10), 1),
            'sibling_count': random.randint(0, 5),
            'age_grade_mismatch': 1 if random.random() < 0.1 else 0,
            'health_condition': random.choice(['Good', 'Average', 'Poor']),
            'institution_issues': random.choice(['None', 'Bullying', 'Infrastructure']),
            'eve_teasing': 1 if random.random() < 0.08 else 0,
            'abuse': 1 if random.random() < 0.03 else 0,
            'remarks': ''
        }
        
        risk_result = calculate_risk_score(student_data)

        uid = f'SS{str(i).zfill(5)}'
        first_names = ['Aarti', 'Sunita', 'Meena', 'Pooja', 'Kavita', 'Ritu',
                       'Suman', 'Geeta', 'Lakshmi', 'Rekha', 'Anita', 'Neha',
                       'Priya', 'Sapna', 'Nisha', 'Deepa', 'Rani', 'Kiran',
                       'Maya', 'Sarita', 'Radha', 'Usha', 'Kamla', 'Janki']
        last_names = ['Sharma', 'Verma', 'Singh', 'Patel', 'Kumar', 'Gupta',
                      'Yadav', 'Rajput', 'Malviya', 'Thakur', 'Jain', 'Soni']
        name = f'{random.choice(first_names)} {random.choice(last_names)}'

        db.execute('''INSERT INTO students
            (student_uid, name, school_id, class, attendance, academic_score,
             menstrual_absence, income_band, migration_flag, marriage_risk_flag,
             application_mode, application_order, daytime_evening,
             prev_qualification, prev_qualification_grade, nacionality, mothers_qualification,
             fathers_qualification, mothers_occupation, fathers_occupation, admission_grade,
             displaced, educational_special_needs, debtor, tuition_fees_up_to_date, gender,
             scholarship_holder, age_at_enrollment, international, curricular_units_credited,
             curricular_units_enrolled, curricular_units_evaluations, curricular_units_approved,
             curricular_units_grade, curricular_units_without_evaluations,
             inflation_rate, school_distance, sibling_count, age_grade_mismatch,
             health_condition, institution_issues, eve_teasing, abuse, remarks,
             risk_score, risk_category, cause)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
            (uid, name, s_id, cls, attendance, academic, menstrual_abs,
             income, migration, marriage,
             student_data['application_mode'], student_data['application_order'],
             student_data['daytime_evening'], student_data['prev_qualification'],
             student_data['prev_qualification_grade'], student_data['nacionality'], student_data['mothers_qualification'],
             student_data['fathers_qualification'], student_data['mothers_occupation'], student_data['fathers_occupation'],
             student_data['admission_grade'], student_data['displaced'], student_data['educational_special_needs'],
             student_data['debtor'], student_data['tuition_fees_up_to_date'], student_data['gender'],
             student_data['scholarship_holder'], student_data['age_at_enrollment'], student_data['international'],
             student_data['curricular_units_credited'], student_data['curricular_units_enrolled'],
             student_data['curricular_units_evaluations'], student_data['curricular_units_approved'],
             student_data['curricular_units_grade'], student_data['curricular_units_without_evaluations'],
             student_data['inflation_rate'],
             student_data['school_distance'], student_data['sibling_count'], student_data['age_grade_mismatch'],
             student_data['health_condition'], student_data['institution_issues'], student_data['eve_teasing'],
             student_data['abuse'], student_data['remarks'],
             risk_result['risk_score'], risk_result['risk_category'], risk_result['cause']))

    db.commit()

    # Generate some interventions for high risk students
    high_risk = db.execute(
        "SELECT id, risk_score, cause FROM students WHERE risk_category IN ('High','Critical') LIMIT 100"
    ).fetchall()

    for s in high_risk:
        if random.random() < 0.6:
            suggestions = get_intervention_suggestions(s['cause'])
            action = random.choice(suggestions['actions'])
            follow_up = random.choice(['pending', 'in_progress', 'completed'])
            days_ago = random.randint(1, 90)
            date = (datetime.now() - timedelta(days=days_ago)).isoformat()

            risk_after = None
            if follow_up == 'completed':
                risk_after = max(10, s['risk_score'] - random.uniform(10, 35))

            db.execute('''INSERT INTO interventions
                (student_id, cause_type, action_taken, officer_id, follow_up_status,
                 date, risk_score_before, risk_score_after)
                VALUES (?,?,?,?,?,?,?,?)''',
                (s['id'], s['cause'], action, random.randint(1, 6),
                 follow_up, date, s['risk_score'], risk_after))
    db.commit()

    # Generate notifications for critical students
    critical = db.execute(
        "SELECT id FROM students WHERE risk_score > 60 LIMIT 30"
    ).fetchall()
    for s in critical:
        db.execute('''INSERT INTO notifications (user_id, student_id, message)
            VALUES (?, ?, ?)''',
            (1, s['id'], f'⚠️ Student ID {s["id"]} risk score exceeds 60. Immediate attention required.'))
    db.commit()


# ─── API Routes ─────────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    db = get_db()
    pwd_hash = hashlib.sha256(data.get('password', '').encode()).hexdigest()
    user = db.execute(
        'SELECT id, username, name, role, school_id, district_id FROM users WHERE username=? AND password_hash=?',
        (data.get('username'), pwd_hash)
    ).fetchone()
    if user:
        return jsonify({
            'success': True,
            'user': dict(user)
        })
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/api/students', methods=['GET'])
def get_students():
    db = get_db()
    school_id = request.args.get('school_id')
    district_id = request.args.get('district_id')
    risk_category = request.args.get('risk_category')

    query = '''SELECT s.*, sc.name as school_name, sc.village, d.name as district_name
               FROM students s
               JOIN schools sc ON s.school_id = sc.id
               JOIN districts d ON sc.district_id = d.id WHERE 1=1'''
    params = []

    if school_id:
        query += ' AND s.school_id = ?'
        params.append(school_id)
    if district_id:
        query += ' AND sc.district_id = ?'
        params.append(district_id)
    if risk_category:
        query += ' AND s.risk_category = ?'
        params.append(risk_category)

    query += ' ORDER BY s.risk_score DESC'
    students = db.execute(query, params).fetchall()
    return jsonify([dict(s) for s in students])


@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    db = get_db()
    student = db.execute(
        '''SELECT s.*, sc.name as school_name, sc.village, d.name as district_name
           FROM students s
           JOIN schools sc ON s.school_id = sc.id
           JOIN districts d ON sc.district_id = d.id
           WHERE s.id = ?''', (student_id,)
    ).fetchone()
    if student:
        return jsonify(dict(student))
    return jsonify({'error': 'Not found'}), 404


@app.route('/api/students/<int:student_id>/explain', methods=['GET'])
def explain_risk(student_id):
    db = get_db()
    student = db.execute('SELECT * FROM students WHERE id = ?', (student_id,)).fetchone()
    if not student:
        return jsonify({'error': 'Not found'}), 404

    result = calculate_risk_score(dict(student))
    return jsonify(result)


@app.route('/api/students/predict', methods=['POST'])
def predict_risk():
    data = request.json
    result = calculate_risk_score(data)

    # If student_id provided, update the record
    student_id = data.get('student_id')
    if student_id:
        db = get_db()
        # Dynamically build update query for all fields provided
        excluded = ['id', 'student_uid', 'last_updated', 'risk_score', 'risk_category', 'cause']
        fields = [f for f in data.keys() if f not in excluded and f != 'student_id']
        
        set_clause = ", ".join([f"{f}=?" for f in fields])
        params = [data[f] for f in fields]
        
        # Add risk results
        set_clause += ", risk_score=?, risk_category=?, cause=?, last_updated=?"
        params.extend([result['risk_score'], result['risk_category'], result['cause'], datetime.now().isoformat()])
        params.append(student_id)
        
        db.execute(f"UPDATE students SET {set_clause} WHERE id=?", params)
        db.commit()

        # Create notification if risk > 60
        if result['risk_score'] > 60:
            db.execute('''INSERT INTO notifications (user_id, student_id, message)
                VALUES (?, ?, ?)''', (1, student_id, f'⚠️ Student risk updated to {result["risk_score"]:.1f}'))
            db.commit()

    return jsonify(result)


@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    db = get_db()
    
    result = calculate_risk_score(data)
    
    # Dynamically build insert query
    fields = [f for f in data.keys() if f != 'student_id']
    count = db.execute('SELECT COUNT(*) FROM students').fetchone()[0]
    uid = f'SS{str(count + 1).zfill(5)}'
    
    fields.append('student_uid')
    data['student_uid'] = uid
    
    fields.extend(['risk_score', 'risk_category', 'cause'])
    
    placeholders = ", ".join(["?" for _ in fields])
    field_names = ", ".join(fields)
    params = [data.get(f, result.get(f)) for f in fields]
    
    db.execute(f"INSERT INTO students ({field_names}) VALUES ({placeholders})", params)
    db.commit()
    return jsonify({'success': True, 'student_uid': uid, **result})


@app.route('/api/interventions', methods=['GET'])
def get_interventions():
    db = get_db()
    student_id = request.args.get('student_id')
    query = '''SELECT i.*, s.student_uid, s.name as student_name
               FROM interventions i
               JOIN students s ON i.student_id = s.id'''
    params = []
    if student_id:
        query += ' WHERE i.student_id = ?'
        params.append(student_id)
    query += ' ORDER BY i.date DESC'
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/interventions', methods=['POST'])
def add_intervention():
    data = request.json
    db = get_db()
    student = db.execute('SELECT risk_score FROM students WHERE id=?',
                        (data['student_id'],)).fetchone()

    db.execute('''INSERT INTO interventions
        (student_id, cause_type, action_taken, officer_id, follow_up_status, risk_score_before)
        VALUES (?,?,?,?,?,?)''',
        (data['student_id'], data['cause_type'], data['action_taken'],
         data.get('officer_id', 1), 'pending',
         student['risk_score'] if student else 0))
    db.commit()

    db.execute('''INSERT INTO audit_logs (user_id, action, details)
        VALUES (?, ?, ?)''',
        (data.get('officer_id', 1), 'intervention_created',
         json.dumps({'student_id': data['student_id'], 'action': data['action_taken']})))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/interventions/<int:intervention_id>/complete', methods=['PUT'])
def complete_intervention(intervention_id):
    db = get_db()
    intervention = db.execute('SELECT * FROM interventions WHERE id=?', (intervention_id,)).fetchone()
    if not intervention:
        return jsonify({'error': 'Not found'}), 404

    student = db.execute('SELECT risk_score FROM students WHERE id=?',
                        (intervention['student_id'],)).fetchone()
    db.execute('UPDATE interventions SET follow_up_status=?, risk_score_after=? WHERE id=?',
              ('completed', student['risk_score'] if student else 0, intervention_id))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/interventions/suggestions/<cause>', methods=['GET'])
def intervention_suggestions(cause):
    return jsonify(get_intervention_suggestions(cause))


@app.route('/api/analytics/overview', methods=['GET'])
def analytics_overview():
    db = get_db()
    district_id = request.args.get('district_id')
    school_id = request.args.get('school_id')

    where = '1=1'
    params = []
    if school_id:
        where = 's.school_id = ?'
        params = [school_id]
    elif district_id:
        where = 'sc.district_id = ?'
        params = [district_id]

    # Risk distribution
    risk_dist = db.execute(f'''
        SELECT risk_category, COUNT(*) as count
        FROM students s JOIN schools sc ON s.school_id = sc.id
        WHERE {where}
        GROUP BY risk_category
    ''', params).fetchall()

    # Totals
    total = db.execute(f'''
        SELECT COUNT(*) as total,
               AVG(risk_score) as avg_risk,
               AVG(attendance) as avg_attendance
        FROM students s JOIN schools sc ON s.school_id = sc.id
        WHERE {where}
    ''', params).fetchone()

    # Top causes
    causes = db.execute(f'''
        SELECT cause, COUNT(*) as count
        FROM students s JOIN schools sc ON s.school_id = sc.id
        WHERE {where} AND risk_category IN ('High','Critical')
        GROUP BY cause ORDER BY count DESC LIMIT 5
    ''', params).fetchall()

    # Intervention stats
    intervention_stats = db.execute('''
        SELECT COUNT(*) as total,
               SUM(CASE WHEN follow_up_status='completed' THEN 1 ELSE 0 END) as completed,
               AVG(CASE WHEN risk_score_after IS NOT NULL
                   THEN risk_score_before - risk_score_after ELSE 0 END) as avg_improvement
        FROM interventions
    ''').fetchone()

    return jsonify({
        'risk_distribution': {r['risk_category']: r['count'] for r in risk_dist},
        'total_students': total['total'],
        'avg_risk_score': round(total['avg_risk'] or 0, 1),
        'avg_attendance': round(total['avg_attendance'] or 0, 1),
        'top_causes': [dict(c) for c in causes],
        'interventions': {
            'total': intervention_stats['total'],
            'completed': intervention_stats['completed'],
            'avg_improvement': round(intervention_stats['avg_improvement'] or 0, 1)
        }
    })


@app.route('/api/analytics/district-heatmap', methods=['GET'])
def district_heatmap():
    db = get_db()
    district_id = request.args.get('district_id')

    query = '''
        SELECT sc.village, sc.name as school_name, sc.id as school_id,
               COUNT(*) as student_count,
               AVG(s.risk_score) as avg_risk,
               SUM(CASE WHEN s.risk_category IN ('High','Critical') THEN 1 ELSE 0 END) as high_risk_count
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
    '''
    params = []
    if district_id:
        query += ' WHERE sc.district_id = ?'
        params.append(district_id)
    query += ' GROUP BY sc.id ORDER BY avg_risk DESC'

    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/analytics/trends', methods=['GET'])
def trends():
    """Simulated monthly trend data."""
    months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
    baseline_dropout = [18.2, 17.8, 17.1, 16.5, 15.8, 14.2, 12.0]
    avg_risk = [52.3, 50.1, 48.7, 46.2, 44.1, 41.8, 39.5]
    attendance = [72.1, 74.3, 76.5, 78.2, 79.8, 81.5, 83.2]

    return jsonify({
        'months': months,
        'dropout_rate': baseline_dropout,
        'avg_risk_score': avg_risk,
        'avg_attendance': attendance
    })


@app.route('/api/analytics/districts', methods=['GET'])
def district_comparison():
    db = get_db()
    rows = db.execute('''
        SELECT d.name as district_name, d.id as district_id,
               COUNT(s.id) as student_count,
               AVG(s.risk_score) as avg_risk,
               SUM(CASE WHEN s.risk_category='Critical' THEN 1 ELSE 0 END) as critical_count,
               SUM(CASE WHEN s.risk_category='High' THEN 1 ELSE 0 END) as high_count,
               AVG(s.attendance) as avg_attendance
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        JOIN districts d ON sc.district_id = d.id
        GROUP BY d.id ORDER BY avg_risk DESC
    ''').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/analytics/high-risk-schools', methods=['GET'])
def high_risk_schools():
    db = get_db()
    district_id = request.args.get('district_id')
    query = '''
        SELECT sc.id, sc.name, sc.village, d.name as district_name,
               COUNT(s.id) as student_count,
               AVG(s.risk_score) as avg_risk,
               SUM(CASE WHEN s.risk_category IN ('High','Critical') THEN 1 ELSE 0 END) as high_risk_count
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        JOIN districts d ON sc.district_id = d.id
    '''
    params = []
    if district_id:
        query += ' WHERE sc.district_id = ?'
        params.append(district_id)
    query += ' GROUP BY sc.id ORDER BY avg_risk DESC LIMIT 10'
    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    db = get_db()
    user_id = request.args.get('user_id', 1)
    rows = db.execute(
        'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20',
        (user_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
def mark_notification_read(notif_id):
    db = get_db()
    db.execute('UPDATE notifications SET is_read=1 WHERE id=?', (notif_id,))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/impact', methods=['GET'])
def impact_stats():
    """Return simulated impact statistics for landing page."""
    db = get_db()
    total = db.execute('SELECT COUNT(*) FROM students').fetchone()[0]
    high_risk = db.execute(
        "SELECT COUNT(*) FROM students WHERE risk_category IN ('High','Critical')"
    ).fetchone()[0]
    interventions_done = db.execute(
        "SELECT COUNT(*) FROM interventions WHERE follow_up_status='completed'"
    ).fetchone()[0]
    improved = db.execute(
        '''SELECT COUNT(*) FROM interventions
           WHERE risk_score_after IS NOT NULL AND risk_score_after < risk_score_before'''
    ).fetchone()[0]

    return jsonify({
        'total_students': total,
        'high_risk_students': high_risk,
        'baseline_dropout_rate': 18.0,
        'current_dropout_rate': 12.0,
        'reduction_percent': 33.0,
        'model_precision': 80,
        'interventions_completed': interventions_done,
        'students_improved': improved,
        'improvement_rate': round((improved / max(interventions_done, 1)) * 100, 1)
    })


@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    db = get_db()
    students = db.execute('''
        SELECT s.student_uid, s.name, sc.name as school_name, d.name as district_name,
               s.class, s.attendance, s.academic_score, s.risk_score,
               s.risk_category, s.cause
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        JOIN districts d ON sc.district_id = d.id
        ORDER BY s.risk_score DESC
    ''').fetchall()

    import io
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student ID', 'Name', 'School', 'District', 'Class',
                     'Attendance %', 'Academic Score', 'Risk Score',
                     'Risk Category', 'Primary Cause'])
    for s in students:
        writer.writerow([s['student_uid'], s['name'], s['school_name'],
                        s['district_name'], s['class'], s['attendance'],
                        s['academic_score'], s['risk_score'],
                        s['risk_category'], s['cause']])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment;filename=shiksha_shield_report.csv'}
    )


# ─── Start ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    print("🛡️  SHIKSHA SHIELD Backend running on http://localhost:5000")
    app.run(debug=True, port=5000)
