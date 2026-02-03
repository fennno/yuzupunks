# Landing Page + Laylo Waitlist

A simple pre-launch landing page that syncs email signups with Laylo for text/email blasts.

## Files

```
/
├── index.html          # the landing page (edit this for design)
├── api/
│   └── subscribe.js    # serverless function that talks to Laylo
├── vercel.json         # routing config
└── README.md           # you're here
```

---

## Setup Steps

### 1. Create a GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it something like `brand-landing` or `yuzu-landing`
3. Make it private if you want
4. Upload these files (drag and drop works)

### 2. Get your Laylo API key

1. Log into Laylo
2. Go to **Settings → Integrations**
3. Scroll to **API Keyring**
4. Enter a label like "landing page"
5. Click generate
6. **Copy and save the key somewhere safe** (you only see it once)

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repo
4. Before deploying, click **"Environment Variables"**
5. Add a variable:
   - Name: `LAYLO_API_KEY`
   - Value: (paste your key from step 2)
6. Click **Deploy**

Your site is now live at `your-project.vercel.app`

### 4. Connect your custom domain

1. In Vercel, go to your project → **Settings → Domains**
2. Type your domain (e.g., `yourbrand.com`)
3. Vercel will show you DNS records to add
4. Have your cofounder log into the domain registrar and add those records
5. Usually takes a few minutes to propagate

---

## Customizing the Design

Open `index.html` and look for the `VIBE ZONE` comment. You can change:

### Colors
```css
:root {
  --bg-color: #0a0a0a;        /* background */
  --text-color: #ffffff;       /* text */
  --accent-color: #ff6b35;     /* button, highlights */
  --input-bg: #1a1a1a;         /* form input background */
  --input-border: #333333;     /* form input border */
}
```

### Background image
Uncomment these lines in the `body` styles:
```css
background-image: url('your-image.jpg');
background-size: cover;
background-position: center;
```

Put your image file in the same folder as `index.html`.

### Logo
Replace the text logo with an image:
```html
<div class="logo">
  <img src="your-logo.png" alt="Brand Logo">
</div>
```

### Collect phone numbers (for SMS)
Uncomment the phone input in the form if you want to collect phone numbers for Laylo SMS blasts.

---

## Testing locally

If you want to test before deploying:

1. Install [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. Run `vercel dev` in this folder
3. It'll ask you to link to a project (create new one)
4. Add your `LAYLO_API_KEY` when prompted
5. Open `localhost:3000`

---

## After launch

When you're ready to switch to your real Shopify store:
- Either redirect this domain to your Shopify
- Or just update the page content to link to your store

The email list you've built will be in Laylo ready for text blasts.
