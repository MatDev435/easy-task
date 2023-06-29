import Image from 'next/image'

export default function Home() {
  return (
    <a
      href={`https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}`}
      className="text-white"
    >
      Hello World!
    </a>
  )
}
