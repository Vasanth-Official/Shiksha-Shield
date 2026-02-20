import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

def generate_synthetic_data(n_samples=2000):
    np.random.seed(42)
    
    # Generate features
    attendance = np.clip(np.random.normal(70, 20, n_samples), 10, 100)
    academic_score = np.clip(np.random.normal(60, 20, n_samples), 10, 100)
    menstrual_absence = np.random.poisson(1.5, n_samples)
    income_band = np.random.choice(['high', 'medium', 'low', 'below_poverty'], p=[0.1, 0.3, 0.4, 0.2], size=n_samples)
    migration_flag = np.random.binomial(1, 0.15, n_samples)
    marriage_risk_flag = np.random.binomial(1, 0.08, n_samples)
    
    # Create target (Risk Category: 0=Low, 1=Moderate, 2=High, 3=Critical)
    # We create a hidden probability formula to generate the target
    base_risk = (100 - attendance) * 0.4 + (100 - academic_score) * 0.3 + menstrual_absence * 5 + migration_flag * 15 + marriage_risk_flag * 20
    
    for i in range(n_samples):
        if income_band[i] == 'low':
            base_risk[i] += 10
        elif income_band[i] == 'below_poverty':
            base_risk[i] += 25
            
    # Normalize risk
    risk_probs = base_risk / base_risk.max()
    
    y = np.zeros(n_samples)
    y[risk_probs > 0.4] = 1 # Moderate
    y[risk_probs > 0.65] = 2 # High
    y[risk_probs > 0.85] = 3 # Critical
    
    df = pd.DataFrame({
        'attendance': attendance,
        'academic_score': academic_score,
        'menstrual_absence': menstrual_absence,
        'income_band': income_band,
        'migration_flag': migration_flag,
        'marriage_risk_flag': marriage_risk_flag,
        'risk_level': y
    })
    
    return df

if __name__ == '__main__':
    print("Generating synthetic data...")
    df = generate_synthetic_data(5000)
    
    X = df.drop('risk_level', axis=1)
    y = df['risk_level']
    
    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['income_band'])
        ],
        remainder='passthrough'
    )
    
    # Model
    model = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10))
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    print("\nModel Evaluation:")
    print(classification_report(y_test, y_pred))
    
    # Save model
    joblib.dump(model, 'dropout_model.pkl')
    print("Model saved to dropout_model.pkl")
