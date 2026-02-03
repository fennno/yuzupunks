// ===========================================
// WAITLIST FORM HANDLER
// Sends email (and optionally phone) to your Vercel serverless function
// which then forwards to Laylo API
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('waitlist-form');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone'); // may be null if not enabled
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const formMessage = document.getElementById('form-message');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get values
    const email = emailInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : null;
    
    // Basic validation
    if (!email) {
      showMessage('Please enter your email.', 'error');
      return;
    }
    
    // Show loading state
    setLoading(true);
    clearMessage();
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          phone: phone || undefined
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        showMessage("You're on the list! We'll text you when we drop.", 'success');
        form.reset();
      } else {
        showMessage(data.error || 'Something went wrong. Try again?', 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showMessage('Connection error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  });
  
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoading.style.display = isLoading ? 'inline' : 'none';
  }
  
  function showMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = 'form-message ' + type;
  }
  
  function clearMessage() {
    formMessage.textContent = '';
    formMessage.className = 'form-message';
  }
});
