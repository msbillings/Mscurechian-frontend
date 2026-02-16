# Hospital Staff Multi-Creation System

## Overview

The Hospital Admin creation page has been enhanced to allow simultaneous creation of up to 3 staff accounts in one go:

1. **Hospital Administrator** (Required)
2. **Pharma Staff** (Optional)
3. **Labs Staff** (Optional)

## Key Features

### ✅ Single Form, Multiple Accounts

- Create 1-3 login accounts simultaneously
- All accounts are associated with the same hospital
- Independent validation for each section

### ✅ Collapsible Optional Sections

- Pharma and Labs sections are collapsed by default
- Expand to enable and fill details
- Clear visual indicators showing enabled/disabled state

### ✅ Comprehensive Validation

- Hospital selection required first
- 10-digit mobile number validation for all staff
- Email format validation
- Password requirements
- All-or-nothing for optional sections (if enabled, all fields required)

### ✅ Enhanced UX

- **Color-coded sections:**
  - Hospital Admin: Blue
  - Pharma Staff: Green
  - Labs Staff: Purple
- Individual password visibility toggles for each account
- Dynamic submit button text showing what will be created
- Success message lists all created roles

### ✅ Workflow

1. Select hospital from searchable dropdown
2. Fill required Hospital Admin details
3. (Optional) Expand and enable Pharma section → Fill details
4. (Optional) Expand and enable Labs section → Fill details
5. Submit - creates all enabled accounts
6. Success notification shows all created roles
7. Auto-redirect to Hospital Admins list

## Form Sections

### 1. Hospital Selection (Required)

- Searchable dropdown
- Displays hospital name, ID, and address
- Visual confirmation of selected hospital

### 2. Hospital Administrator (Required)

- Name, Email, Mobile, Password
- Required for submission
- Blue-themed section

### 3. Pharma Staff (Optional)

- Collapsible section
- Enable checkbox to activate
- Name, Email, Mobile, Password
- Green-themed section
- Independent password toggle

### 4. Labs Staff (Optional)

- Collapsible section
- Enable checkbox to activate
- Name, Email, Mobile, Password
- Purple-themed section
- Independent password toggle

## Validation Rules

### Hospital Admin

- ✅ All fields required
- ✅ Mobile: exactly 10 digits
- ✅ Email: valid format
- ✅ Hospital must be selected

### Pharma Staff (if enabled)

- ✅ All fields required
- ✅ Mobile: exactly 10 digits
- ✅ Email: valid format

### Labs Staff (if enabled)

- ✅ All fields required
- ✅ Mobile: exactly 10 digits
- ✅ Email: valid format

## Success Scenarios

### Scenario 1: Hospital Admin only

**Created:** Hospital Admin  
**Message:** "Hospital admin '[Name]' created successfully!"

### Scenario 2: Hospital Admin + Pharma

**Created:** Hospital Admin, Pharma Staff  
**Message:** "Successfully created: Hospital Admin, Pharma Staff for [Hospital Name]!"

### Scenario 3: Hospital Admin + Labs

**Created:** Hospital Admin, Labs Staff  
**Message:** "Successfully created: Hospital Admin, Labs Staff for [Hospital Name]!"

### Scenario 4: All Three

**Created:** Hospital Admin, Pharma Staff, Labs Staff  
**Message:** "Successfully created: Hospital Admin, Pharma Staff, Labs Staff for [Hospital Name]!"

## Error Handling

- Individual error messages for each role creation
- If Hospital Admin fails, entire process stops
- If Pharma/Labs fail, error shown but Hospital Admin still created
- Form clears only on complete success
- Auto-redirect after 2 seconds

## Technical Implementation

### State Management

```typescript
// Hospital Admin (required)
formData: {
  name, email, mobile, password, hospitalId;
}

// Pharma (optional)
pharmaData: {
  enabled, name, email, mobile, password;
}

// Labs (optional)
labsData: {
  enabled, name, email, mobile, password;
}
```

### API Calls

```typescript
// 1. Create Hospital Admin (always)
await adminService.createHospitalAdminClient(formData);

// 2. Create Pharma if enabled
if (pharmaData.enabled) {
  await adminService.createHospitalAdminClient({
    ...pharmaData,
    role: "pharma",
  });
}

// 3. Create Labs if enabled
if (labsData.enabled) {
  await adminService.createHospitalAdminClient({ ...labsData, role: "labs" });
}
```

## Future Enhancements

- Auto-generate strong passwords option
- Email verification
- Bulk CSV import for multiple staff
- Role-specific permissions configuration
- Copy credentials button
