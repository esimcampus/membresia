# [DashUI Next.js Free Admin Template](https://dashui-free-nextjs-admin-template.vercel.app/)
 Dash UI - Next.js Free admin / dashboard  template created by [Codescandy](https://codescandy.com/) and available on Github

## Configurar Supabase

1. Instala dependencias (ya añadido `@supabase/supabase-js`). Si usas npm:
	- `npm install`
2. Crea un proyecto en https://supabase.com, ve a Project Settings > API y copia:
	- URL del proyecto
	- anon public key
3. Crea un archivo `.env.local` en la raíz (basado en `.env.local.example`) y añade:
	- `NEXT_PUBLIC_SUPABASE_URL=...`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
4. El cliente está disponible en `lib/supabaseClient.js`.
5. Para iniciar en local:
	- `npm run dev`

![dashui-free-nextjs-admin-template](https://user-images.githubusercontent.com/68774600/231716707-3da30d19-b826-4692-b03a-fed41376d250.jpg)

 
## How to use DashUI?

Clone the Dash UI repo:
```
git clone https://github.com/codescandy/dashui-free-nextjs-admin-template.git
```
```
cd dashui-free-nextjs-admin-template
```

##  🚀 Getting Started 

### Installation 👨🏻‍💻

1. Install all packages

```
npm i
```

2. Run Development Server

```
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


3. Build your project

```
npm run build
```

## Dash UI Next.js Free / Pro Version

| Free Version        | Dash UI Pro
|---------------------|-------------------------------------------- |
| 1 Dashboard      | Coming Soon...                                |
| Profile      | -                                           |
| Settings | -                                     |
| Billing |
| Pricing |
| 404 Error |
| Authentication |
| [Demo](https://dashui-free-nextjs-admin-template.vercel.app/) |

## Technical Support or Questions
If you have questions or need help integrating the product please [contact us](https://codescandy.com/contact-us/).

