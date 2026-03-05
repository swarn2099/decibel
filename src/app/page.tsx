export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-6xl font-bold tracking-tight sm:text-8xl">
          <span className="bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent">
            DECIBEL
          </span>
        </h1>
        <p className="max-w-md text-lg font-light text-gray">
          The more you show up, the more you get in.
        </p>
        <div className="mt-8 flex h-1 w-24 rounded-full bg-gradient-to-r from-pink to-purple" />
      </div>
    </div>
  );
}
