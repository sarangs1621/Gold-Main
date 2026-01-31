from pydantic import BaseModel, Field, validator
from typing import Optional
import re
import bleach
import html


# ============================================================================
# INPUT SANITIZATION UTILITIES
# ============================================================================

def sanitize_html(text: Optional[str]) -> Optional[str]:
    """
    Remove all HTML tags and script content from text input.
    Prevents XSS attacks by stripping dangerous HTML/JavaScript.
    """
    if text is None:
        return None
    # Remove all HTML tags including scripts
    cleaned = bleach.clean(text, tags=[], strip=True)
    return cleaned.strip()

def sanitize_text_field(text: Optional[str], max_length: int = None) -> Optional[str]:
    """
    Sanitize general text field by:
    1. Removing HTML/script tags
    2. Escaping special characters
    3. Trimming whitespace
    4. Enforcing max length
    """
    if text is None:
        return None
    
    # Remove HTML tags
    cleaned = sanitize_html(text)
    
    # Escape HTML entities
    cleaned = html.escape(cleaned)
    
    # Trim whitespace
    cleaned = cleaned.strip()
    
    # Enforce max length
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    
    return cleaned if cleaned else None

def sanitize_email(email: Optional[str]) -> Optional[str]:
    """
    Sanitize and validate email address.
    """
    if email is None:
        return None
    
    email = email.strip().lower()
    
    # Basic email validation pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise ValueError('Invalid email format')
    
    return email

def sanitize_phone(phone: Optional[str]) -> Optional[str]:
    """
    Sanitize phone number by allowing only digits, spaces, +, -, (, )
    """
    if phone is None:
        return None
    
    # Remove HTML tags first
    phone = sanitize_html(phone)
    
    # Allow only valid phone characters
    phone = re.sub(r'[^\d\s\-\+\(\)]', '', phone)
    
    return phone.strip() if phone else None

def sanitize_numeric_string(value: str) -> str:
    """
    Sanitize numeric string inputs (amounts, weights, etc.)
    Removes non-numeric characters except decimal point and minus sign.
    """
    if value is None:
        return None
    
    # Remove HTML tags
    value = sanitize_html(str(value))
    
    # Keep only numbers, decimal point, and minus sign
    value = re.sub(r'[^\d\.\-]', '', value)
    
    return value

def validate_amount(amount: float, min_val: float = -1000000, max_val: float = 1000000) -> float:
    """
    Validate numeric amount is within acceptable range.
    """
    if amount < min_val or amount > max_val:
        raise ValueError(f'Amount must be between {min_val} and {max_val}')
    return amount

def validate_percentage(percentage: float) -> float:
    """
    Validate percentage is between 0 and 100.
    """
    if percentage < 0 or percentage > 100:
        raise ValueError('Percentage must be between 0 and 100')
    return percentage

def validate_purity(purity: int) -> int:
    """
    Validate gold purity is within acceptable range (1-999).
    """
    if purity < 1 or purity > 999:
        raise ValueError('Purity must be between 1 and 999')
    return purity


class PartyValidator(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    party_type: str = Field(..., pattern="^(customer|vendor|worker)$")
    notes: Optional[str] = Field(None, max_length=1000)
    
    @validator('name')
    def sanitize_name(cls, v):
        return sanitize_text_field(v, max_length=100)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v:
            v = sanitize_phone(v)
            if v and not re.match(r'^\+?[\d\s\-()]+$', v):
                raise ValueError('Invalid phone number format')
        return v
    
    @validator('address')
    def sanitize_address(cls, v):
        return sanitize_text_field(v, max_length=500)
    
    @validator('notes')
    def sanitize_notes(cls, v):
        return sanitize_text_field(v, max_length=1000)

class StockMovementValidator(BaseModel):
    movement_type: str = Field(..., pattern="^(Stock IN|Stock OUT|Adjustment IN|Adjustment OUT|Transfer)$")
    header_id: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1, max_length=200)
    qty_delta: float = Field(..., ge=-10000, le=10000)
    weight_delta: float = Field(..., ge=-10000, le=10000)
    purity: int = Field(..., ge=1, le=999)
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('description')
    def sanitize_description(cls, v):
        return sanitize_text_field(v, max_length=200)
    
    @validator('notes')
    def sanitize_notes(cls, v):
        return sanitize_text_field(v, max_length=500)
    
    @validator('purity')
    def validate_purity_range(cls, v):
        return validate_purity(v)

class JobCardValidator(BaseModel):
    card_type: str = Field(..., pattern="^(repair|custom|polish|resize)$")
    customer_id: Optional[str] = None
    customer_name: Optional[str] = Field(None, max_length=100)
    worker_id: Optional[str] = None
    worker_name: Optional[str] = Field(None, max_length=100)
    delivery_date: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    
    @validator('customer_name')
    def sanitize_customer_name(cls, v):
        return sanitize_text_field(v, max_length=100)
    
    @validator('worker_name')
    def sanitize_worker_name(cls, v):
        return sanitize_text_field(v, max_length=100)
    
    @validator('notes')
    def sanitize_notes(cls, v):
        return sanitize_text_field(v, max_length=1000)

class AccountValidator(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: str = Field(..., pattern="^(cash|bank|credit_card|mobile_wallet)$")
    opening_balance: float = Field(default=0, ge=-1000000, le=1000000)
    
    @validator('name')
    def sanitize_name(cls, v):
        return sanitize_text_field(v, max_length=100)
    
    @validator('opening_balance')
    def validate_balance(cls, v):
        return validate_amount(v)

class TransactionValidator(BaseModel):
    transaction_type: str = Field(..., pattern="^(credit|debit)$")
    mode: str = Field(..., pattern="^(cash|bank_transfer|card|cheque|online)$")
    account_id: str = Field(..., min_length=1)
    party_id: Optional[str] = None
    party_name: Optional[str] = Field(None, max_length=100)
    amount: float = Field(..., gt=0, le=1000000)
    category: str = Field(..., max_length=50)
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('party_name')
    def sanitize_party_name(cls, v):
        return sanitize_text_field(v, max_length=100)
    
    @validator('category')
    def sanitize_category(cls, v):
        return sanitize_text_field(v, max_length=50)
    
    @validator('notes')
    def sanitize_notes(cls, v):
        return sanitize_text_field(v, max_length=500)
    
    @validator('amount')
    def validate_amount_range(cls, v):
        return validate_amount(v, min_val=0.01, max_val=1000000)

class UserUpdateValidator(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None, pattern="^(admin|manager|staff)$")
    is_active: Optional[bool] = None
    
    @validator('username')
    def sanitize_username(cls, v):
        if v:
            # Remove HTML but keep alphanumeric and basic chars
            v = sanitize_html(v)
            v = re.sub(r'[^\w\-\.]', '', v)
        return v
    
    @validator('email')
    def sanitize_email_field(cls, v):
        return sanitize_email(v) if v else None
    
    @validator('full_name')
    def sanitize_full_name(cls, v):
        return sanitize_text_field(v, max_length=100)

class PasswordChangeValidator(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100)
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c.isalpha() for c in v):
            raise ValueError('Password must contain at least one letter')
        return v
