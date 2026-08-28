# Dr.Omir — Personal Medical Website

A clean white + medical-blue personal website for GitHub Pages.

## Files
- `index.html` — website structure and content
- `style.css` — design and responsive layout
- `script.js` — menu, resource search/filter, animations, WhatsApp contact form
- `assets/doctor-placeholder.svg` — temporary portrait placeholder

## How to customize

### 1. Your photo
Replace `assets/doctor-placeholder.svg` with your photo, or edit the `<img>` in `index.html` to point to your own image.

### 2. Your information
Search `Dr. Omir`, `Your Medical Specialty`, `Egypt`, `your@email.com`, etc. in `index.html` and replace them.

### 3. PDF / files
For each resource card, replace the Google Drive URL with the share link to your file.

For Google Drive:
- Right click the file
- Share
- General access: Anyone with the link (if you want public access)
- Copy link
- Paste it into `href="..."`

### 4. Videos
Replace the YouTube links in `index.html` with your actual YouTube video links.

### 5. WhatsApp
Open `script.js` and change:
`const whatsappNumber = '201000000000';`
Use your country code + number, without `+` or spaces.

## GitHub Pages
1. Create a new GitHub repository.
2. Upload all files and the `assets` folder.
3. Go to Settings → Pages.
4. Under Build and deployment, choose "Deploy from a branch".
5. Select `main` and `/ (root)`.
6. Save.
7. GitHub will give you your website URL.

You can later connect a custom domain from the same Pages settings.
