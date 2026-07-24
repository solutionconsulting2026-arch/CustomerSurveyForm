/* ==========================================================================
   XYZ Bank Customer Survey - Core Application Logic
   ========================================================================== */

// --- API Configurations ---
const SURVEY_API_CONFIG = {
    authUrl: "https://presales1.businessbywire.com/restapigold8demo/oauth2/token",
    saveUrl: "https://presales1.businessbywire.com/restapigold8demo/crmWebApi/saveObject",
    credentials: {
        userName: "james@crmnext.com",
        password: "Chief@admin2025"
    }
};

// Asynchronous authentication helper
async function getAuthToken() {
    const response = await fetch(SURVEY_API_CONFIG.authUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(SURVEY_API_CONFIG.credentials)
    });
    
    if (!response.ok) {
        throw new Error("Authentication failed with status " + response.status);
    }
    
    const data = await response.json();
    const token = data.access_token || data.token || data.accessToken || data.token_id;
    return token;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State variables ---
    let currentOtp = "";
    let isOtpVerified = false;
    let currentCaptchaText = "";

    // --- DOM Elements ---
    const appLayout = document.querySelector('.app-layout');
    
    // Notification Banner
    const notificationBanner = document.getElementById('notification-banner');
    const notificationText = document.getElementById('notification-text');
    const closeNotificationBtn = document.querySelector('.close-notification');
    
    // Customer Auth Section
    const idTypeRadios = document.getElementsByName('id_type');
    const identifierLabel = document.getElementById('identifier-label');
    const identifierInput = document.getElementById('identifier-input');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const otpSuccess = document.getElementById('otp-success');
    const identifierError = document.getElementById('identifier-error');
    
    // OTP Modal Elements
    const otpModal = document.getElementById('otp-modal');
    const btnCloseOtpModal = document.getElementById('btn-close-otp-modal');
    const modalOtpInput = document.getElementById('modal-otp-input');
    const btnModalVerifyOtp = document.getElementById('btn-modal-verify-otp');
    const btnModalResendOtp = document.getElementById('btn-modal-resend-otp');
    const modalOtpError = document.getElementById('modal-otp-error');
    
    // Form Inputs
    const feedbackForm = document.getElementById('feedback-form');
    const customerNameInput = document.getElementById('customer-name');
    const feedbackComments = document.getElementById('feedback-comments');
    const captchaInput = document.getElementById('captcha-input');
    const btnRefreshCaptcha = document.getElementById('btn-refresh-captcha');
    const btnSubmitSurvey = document.getElementById('btn-submit-survey');

    // ==========================================================================
    // 1. SURVEY INTERACTION: OTP MODAL, DROPDOWNS, CAPTCHA
    // ==========================================================================

    // Handle identification type switch (Mobile vs Account)
    idTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            identifierInput.value = "";
            identifierInput.classList.remove('has-error');
            identifierInput.parentElement.parentElement.classList.remove('has-error');
            
            // Reset OTP Verification State
            isOtpVerified = false;
            otpSuccess.classList.add('hidden');
            btnSendOtp.textContent = "Send OTP";
            btnSendOtp.disabled = false;
            identifierInput.disabled = false;
            
            if (val === 'mobile') {
                identifierLabel.innerHTML = `Registered Mobile Number: <span class="required">*</span>`;
                identifierInput.placeholder = "Enter 10-digit Mobile Number";
                identifierInput.maxLength = 10;
                identifierError.textContent = "Mobile Number cannot be empty";
            } else {
                identifierLabel.innerHTML = `XYZ Bank Account Number: <span class="required">*</span>`;
                identifierInput.placeholder = "Enter 16-digit Account Number";
                identifierInput.maxLength = 16;
                identifierError.textContent = "Account Number cannot be empty";
            }
        });
    });

    // Input fields validation rules for numeric fields
    identifierInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    modalOtpInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Send OTP -> Opens Modal Popup
    btnSendOtp.addEventListener('click', triggerOtpDispatch);
    btnModalResendOtp.addEventListener('click', triggerOtpDispatch);

    function triggerOtpDispatch() {
        const idType = document.querySelector('input[name="id_type"]:checked').value;
        const val = identifierInput.value.trim();
        const groupEl = identifierInput.parentElement.parentElement;
        
        // Validation of input first
        if (val === "") {
            groupEl.classList.add('has-error');
            identifierError.textContent = idType === 'mobile' 
                ? "Mobile Number cannot be empty" 
                : "Account Number cannot be empty";
            return;
        }

        if (idType === 'mobile' && val.length !== 10) {
            groupEl.classList.add('has-error');
            identifierError.textContent = "Please enter a valid 10-digit Mobile Number";
            return;
        }

        if (idType === 'account' && val.length !== 16) {
            groupEl.classList.add('has-error');
            identifierError.textContent = "Please enter a valid 16-digit Account Number";
            return;
        }

        // Pass validation
        groupEl.classList.remove('has-error');
        
        // Set static OTP code
        currentOtp = "123456";
        
        console.log(`[XYZ BANK OTP SYSTEM] OTP generated for ${val}: ${currentOtp}`);
        
        // Show OTP Modal
        modalOtpInput.value = "";
        modalOtpError.classList.remove('has-error');
        modalOtpError.style.display = "none";
        otpModal.classList.remove('hidden');
        modalOtpInput.focus();
    }

    // Modal Close
    btnCloseOtpModal.addEventListener('click', () => {
        otpModal.classList.add('hidden');
    });

    // Verify OTP inside Modal
    btnModalVerifyOtp.addEventListener('click', () => {
        const entered = modalOtpInput.value.trim();
        
        if (entered === "") {
            modalOtpError.textContent = "Please enter verification code";
            modalOtpError.style.display = "block";
            return;
        }

        if (entered !== currentOtp) {
            modalOtpError.textContent = "Incorrect OTP code. Please try again.";
            modalOtpError.style.display = "block";
            return;
        }

        // Success Verify
        modalOtpError.style.display = "none";
        isOtpVerified = true;
        
        // Close modal
        otpModal.classList.add('hidden');
        
        // Update inline status on main form
        identifierInput.disabled = true;
        btnSendOtp.disabled = true;
        btnSendOtp.textContent = "Verified";
        otpSuccess.classList.remove('hidden');
        
        showNotification("✓ Identity verification successful. You may now complete the survey.", "success");
    });



    // Canvas CAPTCHA generation
    function drawCaptcha() {
        const canvas = document.getElementById('captcha-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background noise fills
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Generate random string
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let text = '';
        for (let i = 0; i < 6; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        currentCaptchaText = text;
        
        // Render characters
        ctx.font = 'bold 28px "Outfit", sans-serif';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < text.length; i++) {
            const letter = text[i];
            const x = 15 + i * 23;
            const y = canvas.height / 2 + (Math.random() * 10 - 5);
            const angle = (Math.random() * 30 - 15) * Math.PI / 180;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            const colors = ['#0a2540', '#1e293b', '#312e81', '#065f46'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            
            ctx.fillText(letter, 0, 0);
            ctx.restore();
        }
        
        // Draw noise lines
        for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = `rgba(10, 37, 64, ${Math.random() * 0.3})`;
            ctx.lineWidth = 1 + Math.random() * 1.5;
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
        
        // Draw noise dots
        for (let i = 0; i < 35; i++) {
            ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random(), 0, 2 * Math.PI);
            ctx.fill();
        }
        
        captchaInput.value = "";
    }

    btnRefreshCaptcha.addEventListener('click', drawCaptcha);
    drawCaptcha();


    // ==========================================================================
    // 2. DATA COMPILATION & SUBMISSION DISPATCH
    // ==========================================================================

    function getFormattedDate() {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        return mm + '/' + dd + '/' + yyyy;
    }

    function gatherFormData() {
        const idType = document.querySelector('input[name="id_type"]:checked').value;
        const idValue = identifierInput.value.trim();
        const customerName = customerNameInput.value.trim();
        const gender = document.querySelector('input[name="gender"]:checked')?.value || "";
        const ageGroupRaw = document.querySelector('input[name="age_group"]:checked')?.value || "";
        
        // Age mapping
        let ageGroup = "18 - 60";
        if (ageGroupRaw === "Under 18 years") ageGroup = "Under 18";
        if (ageGroupRaw === "60 years and above") ageGroup = "60+";

        const accountTypes = [];
        document.querySelectorAll('input[name="account_type"]:checked').forEach(cb => {
            accountTypes.push(cb.value);
        });

        const npsRecommend = document.querySelector('input[name="nps_recommend"]:checked')?.value || "";
        
        const recommendProducts = [];
        document.querySelectorAll('input[name="recommend_products"]:checked').forEach(cb => {
            recommendProducts.push(cb.value);
        });

        const comments = feedbackComments.value.trim();

        const mobilePhone = idType === 'mobile' ? idValue : "";
        const accountNumber = idType === 'account' ? idValue : "";

        return [
            {
                "ItemId": "0",
                "ItemType": "KIT",
                "ProcessMode": "Create",
                "OutputFieldList": [
                    "ItemId"
                ],
                "ObjectData": {
                    "LayoutID": 103121,
                    "ProcessID": 50176,
                    "MobilePhone": mobilePhone,
                    "KIT_ex1_64": accountNumber,
                    "Subject": "Home Loan Customer Satisfaction Survey",
                    "KIT_ex1_65": gender,
                    "KIT_ex1_66": ageGroup,
                    "KIT_ex1_67": accountTypes.join(", "),
                    "KIT_ex1_68": npsRecommend,
                    "KIT_ex1_69": recommendProducts.join(", "),
                    "ProductID": "Home Loan",
                    "Country": "Malaysia",
                    "State": "Wilayah Persekutuan Kuala Lumpur",
                    "District": "Kuala Lumpur",
                    "SubDistrict": "Jalan Tun Razak",
                    "PinCode": "50400",
                    "CurrencyID": "MYR",
                    "CustomObjectId": "",
                    "Detail": comments,
                    "Email": "John@gmail.com",
                    "ProductCategoryID": "Home Loans",
                    "RelatedToName": customerName,
                    "TerritoryID": "Asia Pacific",
                    "ContactDate": getFormattedDate(),
                    "AccountID" : 2356
                }
            }
        ];
    }

    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let hasErrors = false;
        let firstErrorElement = null;

        // Clear error feedback visuals
        document.querySelectorAll('.form-group, .feedback-question').forEach(el => {
            el.classList.remove('has-error');
        });

        function markError(el, targetGroup) {
            hasErrors = true;
            targetGroup.classList.add('has-error');
            if (!firstErrorElement) {
                firstErrorElement = el || targetGroup;
            }
        }

        // 1. Identity Check
        const idValue = identifierInput.value.trim();
        const idType = document.querySelector('input[name="id_type"]:checked').value;
        const idGroup = identifierInput.parentElement.parentElement;
        
        if (idValue === "") {
            markError(identifierInput, idGroup);
            identifierError.textContent = idType === 'mobile' 
                ? "Mobile Number cannot be empty" 
                : "Account Number cannot be empty";
        } else if (idType === 'mobile' && idValue.length !== 10) {
            markError(identifierInput, idGroup);
            identifierError.textContent = "Please enter a valid 10-digit Mobile Number";
        } else if (idType === 'account' && idValue.length !== 16) {
            markError(identifierInput, idGroup);
            identifierError.textContent = "Please enter a valid 16-digit Account Number";
        } else if (!isOtpVerified) {
            markError(identifierInput, idGroup);
            identifierError.textContent = "Please verify your mobile/account with OTP first";
        }

        // 2. Demographics Checks
        if (customerNameInput.value.trim() === "") {
            markError(customerNameInput, customerNameInput.parentElement);
        }

        const accountsChecked = document.querySelectorAll('input[name="account_type"]:checked');
        if (accountsChecked.length === 0) {
            markError(null, document.getElementById('account-type-error').parentElement);
        }



        // 3. Question Metrics Checks
        if (!document.querySelector('input[name="nps_recommend"]:checked')) {
            markError(null, document.getElementById('nps-recommend-error').parentElement);
        }

        const q10Checked = document.querySelectorAll('input[name="recommend_products"]:checked');
        if (q10Checked.length === 0) {
            markError(null, document.getElementById('recommend-products-error').parentElement);
        }

        if (!document.querySelector('input[name="nps_ease"]:checked')) {
            markError(null, document.getElementById('nps-ease-error').parentElement);
        }

        if (!document.querySelector('input[name="staff_friendliness"]:checked')) {
            markError(null, document.getElementById('staff-friendliness-error').parentElement);
        }

        if (!document.querySelector('input[name="overall_service"]:checked')) {
            markError(null, document.getElementById('overall-service-error').parentElement);
        }

        if (!document.querySelector('input[name="nps_future"]:checked')) {
            markError(null, document.getElementById('nps-future-error').parentElement);
        }

        if (feedbackComments.value.trim() === "") {
            markError(feedbackComments, feedbackComments.parentElement);
        }

        // 4. Captcha Check
        const enteredCaptcha = captchaInput.value.trim();
        if (enteredCaptcha === "") {
            markError(captchaInput, captchaInput.parentElement.parentElement);
            document.getElementById('captcha-error').textContent = "Please enter security code";
        } else if (enteredCaptcha !== currentCaptchaText) {
            markError(captchaInput, captchaInput.parentElement.parentElement);
            document.getElementById('captcha-error').textContent = "Invalid code. Characters are case-sensitive.";
            drawCaptcha();
        }

        if (hasErrors) {
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstErrorElement.focus();
            }
            showNotification("Validation failed. Please fill all required fields correctly.", "error");
            return;
        }

        dispatchSurveyData();
    });

    async function dispatchSurveyData() {
        const payload = gatherFormData();
        
        btnSubmitSurvey.disabled = true;
        const originalBtnText = btnSubmitSurvey.innerHTML;
        btnSubmitSurvey.innerHTML = `<span class="pulse-dot" style="display:inline-block; margin-right:8px; background-color:#ffffff; box-shadow: 0 0 8px #ffffff;"></span> Authenticating...`;
        
        try {
            // 1. Fetch OAuth2 Token
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Authentication response did not contain a valid token.");
            }
            
            // 2. Submit Survey Details
            btnSubmitSurvey.innerHTML = `<span class="pulse-dot" style="display:inline-block; margin-right:8px; background-color:#ffffff; box-shadow: 0 0 8px #ffffff;"></span> Submitting Survey...`;
            
            const response = await fetch(SURVEY_API_CONFIG.saveUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error("Survey creation failed with status: " + response.status);
            }
            
            // Redirect to Thank You page passing a generated reference number
            const refNumber = 'SRV-' + Math.floor(Math.random() * 900000000 + 100000000);
            window.location.href = `thankyou.html?ref=${refNumber}`;
            
        } catch (err) {
            console.error("Survey Form backend flow failed:", err);
            showNotification(`❌ Submission Failed: ${err.message || 'Network/Server connection issue.'}`, 'error');
        } finally {
            btnSubmitSurvey.disabled = false;
            btnSubmitSurvey.innerHTML = originalBtnText;
        }
    }

    function resetFeedbackForm() {
        // Reset otp state
        isOtpVerified = false;
        otpSuccess.classList.add('hidden');
        identifierInput.value = "";
        identifierInput.disabled = false;
        btnSendOtp.disabled = false;
        btnSendOtp.textContent = "Send OTP";
        
        customerNameInput.value = "";
        feedbackComments.value = "";
        

        
        document.querySelector('input[name="gender"][value="Male"]').checked = true;
        document.querySelector('input[name="age_group"][value="18 to 60 years"]').checked = true;
        document.querySelector('input[name="staff_friendliness"][value="Neutral"]').checked = true;
        document.querySelector('input[name="overall_service"][value="Good"]').checked = true;
        
        document.querySelectorAll('input[name="nps_recommend"], input[name="nps_ease"], input[name="nps_future"]').forEach(el => {
            el.checked = false;
        });

        document.querySelectorAll('input[name="account_type"], input[name="recommend_products"]').forEach(el => {
            if (el.name === 'account_type' && el.value === 'Savings') {
                el.checked = true;
            } else {
                el.checked = false;
            }
        });

        drawCaptcha();
    }

    // Show Alerts
    function showNotification(text, type = 'success') {
        notificationText.textContent = text;
        notificationBanner.className = `notification-banner ${type}`;
        notificationBanner.classList.remove('hidden');
        
        notificationBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (type === 'success') {
            setTimeout(() => {
                if (notificationText.textContent === text) {
                    notificationBanner.classList.add('hidden');
                }
            }, 10000);
        }
    }

    closeNotificationBtn.addEventListener('click', () => {
        notificationBanner.classList.add('hidden');
    });
});
