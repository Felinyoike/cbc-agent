<!-- screenType: "desktop-medium" width: "1440" height: "1024" name: "Screen 2" colorTheme: "default" screenId: "3d3ff3ab-604b-465d-9091-f01847545f0e" -->
<div className="min-h-[1024px] bg-white text-neutral-950 flex w-full h-fit">
  <aside className="shrink-0 bg-neutral-50 border-neutral-200 border-t-0 border-r-1 border-b-0 border-l-0 border-solid flex p-4 flex-col justify-start items-stretch gap-6 w-64">
    <div className="flex px-2 pt-2 items-center gap-2">
      <div className="size-9 bg-[oklch(0.55_0.09_165)] shrink-0 rounded-lg flex justify-center items-center">
        <Sprout className="size-5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="leading-tight font-semibold text-neutral-950 text-sm leading-5">
          CBC Teacher
        </span>
        <span className="leading-tight text-neutral-500 text-xs leading-4">
          Workflow Agent
        </span>
      </div>
    </div>
    <nav className="flex flex-col gap-1">
      <a className="bg-[oklch(0.93_0.03_165)] text-[oklch(0.4_0.09_165)] border-[oklch(0.85_0.05_165)] font-medium rounded-lg text-sm leading-5 border-black/1 border-1 border-solid flex px-3 py-2.5 items-center gap-3">
        <Home className="size-4.5 shrink-0" />
        <span>Home</span>
      </a>
      <a className="transition-colors font-medium rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2.5 items-center gap-3">
        <BookOpen className="size-4.5 shrink-0" />
        <span>Curriculum Explorer</span>
      </a>
      <a className="transition-colors font-medium rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2.5 items-center gap-3">
        <FileText className="size-4.5 shrink-0" />
        <span>Term Plans</span>
      </a>
      <a className="transition-colors font-medium rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2.5 items-center gap-3">
        <Calendar className="size-4.5 shrink-0" />
        <span>Daily Lessons</span>
      </a>
      <a className="transition-colors font-medium rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2.5 items-center gap-3">
        <CheckCircle className="size-4.5 shrink-0" />
        <span>Reflections</span>
        <Badge className="bg-[oklch(0.92_0.09_75)] text-[oklch(0.42_0.09_75)] border-transparent text-xs leading-4 ml-auto px-1.5">
          2
        </Badge>
      </a>
      <a className="transition-colors font-medium rounded-lg text-neutral-950 text-sm leading-5 flex px-3 py-2.5 items-center gap-3">
        <Library className="size-4.5 shrink-0" />
        <span>My Library</span>
      </a>
    </nav>
    <div className="flex mt-auto flex-col gap-3">
      <div className="rounded-lg bg-white border-neutral-200 border-1 border-solid flex p-3 flex-col gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-3.5 text-neutral-500" />
          <span className="font-medium text-neutral-950 text-xs leading-4">
            Prototype · Mock data
          </span>
        </div>
        <p className="leading-snug text-neutral-500 text-[11px]">
          Screens are not connected to live KICD data.
        </p>
      </div>
    </div>
  </aside>
  <div className="min-w-0 flex flex-col flex-1">
    <header className="shrink-0 bg-white border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 items-center gap-4 h-16">
      <div className="shrink-0 flex items-center gap-2">
        <GraduationCap className="size-4 text-[oklch(0.55_0.09_165)]" />
        <span className="font-medium text-neutral-950 text-sm leading-5">
          Grade 5 · Agriculture · Term 1 · 2026 · 5 East
        </span>
      </div>
      <div className="max-w-md ml-2 flex-1">
        <div className="relative">
          <Search className="size-4 top-1/2 -translate-y-1/2 text-neutral-500 absolute left-3" />
          <Input
            placeholder="Ask about curriculum…"
            className="bg-neutral-100/50 border-neutral-200 border-0 border-solid pl-9 h-9"
            defaultValue=""
          />
        </div>
      </div>
      <div className="shrink-0 flex ml-auto items-center gap-3">
        <div className="bg-[oklch(0.95_0.03_165)] rounded-full border-neutral-200 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
          <span className="size-2 bg-[oklch(0.6_0.12_165)] rounded-full" />
          <span className="text-[oklch(0.42_0.09_165)] font-medium text-xs leading-4">
            Planning: Term 1 open
          </span>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="relative rounded-full">
            <Bell className="size-5 text-neutral-500" />
            <span className="size-4 bg-[oklch(0.72_0.15_55)] font-semibold rounded-full text-white text-[10px] flex absolute right-1 top-1 justify-center items-center">
              3
            </span>
          </Button>
        </div>
        <div className="border-neutral-200 border-t-0 border-r-0 border-b-0 border-l-1 border-solid flex pl-2 items-center gap-2">
          <img
            src="https://images.unsplash.com/photo-1660735148170-223b66e9f941?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxLZW55YW4lMjB0ZWFjaGVyJTIwcG9ydHJhaXR8ZW58MXwyfHx8MTc4Nzc1MDIyOHww&ixlib=rb-4.1.0&q=80&w=400"
            alt="Teacher profile"
            className="size-8 object-cover rounded-full"
            data-photoid="fXT5DT3oC_0"
            data-authorname="Fatima Yusuf"
            data-authorurl="https://unsplash.com/@fatima_yusuf"
            data-blurhash="LUD^ZO%~l.S_I7k=g3X.RroJrXwa"
          />
          <div className="leading-tight flex flex-col">
            <span className="font-semibold text-neutral-950 text-xs leading-4">
              A. Wanjiru
            </span>
            <span className="text-neutral-500 text-[11px]">Teacher</span>
          </div>
          <ChevronDown className="size-4 text-neutral-500" />
        </div>
      </div>
    </header>
    <main className="overflow-y-auto bg-[oklch(0.985_0.005_120)] flex p-8 flex-col flex-1 gap-8">
      <section className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-semibold text-neutral-950 text-2xl leading-8">
            Welcome back, Ms. Wanjiru
          </h1>
          <p className="text-neutral-500 text-sm leading-5">
            You're working on
            <span className="font-medium text-neutral-950">
              Grade 5 · Agriculture · Term 1 · 5 East
            </span>
            . Here's what needs your attention.
          </p>
        </div>
        <Button variant="outline" className="shrink-0 gap-2">
          <Settings2 className="size-4" />
          Change context
        </Button>
      </section>
      <section className="grid grid-cols-3 gap-6">
        <Card className="transition-shadow cursor-pointer border-neutral-200 border-0 border-solid p-6 gap-4">
          <CardHeader className="p-0 gap-3">
            <div className="size-11 bg-[oklch(0.93_0.03_165)] rounded-xl flex justify-center items-center">
              <BookOpen className="size-5.5 text-[oklch(0.45_0.09_165)]" />
            </div>
            <CardTitle className="text-base leading-6">
              Explore curriculum
            </CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-3">
            <p className="leading-snug text-neutral-500 text-sm leading-5">
              Search KICD-aligned strands, outcomes, and learning experiences.
            </p>
            <Button
              variant="ghost"
              className="text-[oklch(0.45_0.09_165)] px-0 self-start gap-1.5 h-auto"
            >
              Open explorer
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-shadow cursor-pointer border-neutral-200 border-0 border-solid p-6 gap-4">
          <CardHeader className="p-0 gap-3">
            <div className="size-11 bg-[oklch(0.93_0.02_240)] rounded-xl flex justify-center items-center">
              <FileText className="size-5.5 text-[oklch(0.45_0.09_240)]" />
            </div>
            <CardTitle className="text-base leading-6">
              Prepare term plan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-3">
            <p className="leading-snug text-neutral-500 text-sm leading-5">
              Build a termly scheme of work from selected evidence.
            </p>
            <Button
              variant="ghost"
              className="text-[oklch(0.45_0.09_240)] px-0 self-start gap-1.5 h-auto"
            >
              Start planning
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-shadow cursor-pointer border-neutral-200 border-0 border-solid p-6 gap-4">
          <CardHeader className="p-0 gap-3">
            <div className="size-11 bg-[oklch(0.93_0.03_165)] rounded-xl flex justify-center items-center">
              <CalendarCheck className="size-5.5 text-[oklch(0.45_0.09_165)]" />
            </div>
            <CardTitle className="text-base leading-6">
              Prepare today's lesson
            </CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-3">
            <p className="leading-snug text-neutral-500 text-sm leading-5">
              Draft a daily lesson plan from a term-plan row.
            </p>
            <Button
              variant="ghost"
              className="text-[oklch(0.45_0.09_165)] px-0 self-start gap-1.5 h-auto"
            >
              Plan lesson
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
      <section>
        <Card className="border-[oklch(0.85_0.07_75)] bg-[oklch(0.97_0.03_80)] p-6 gap-4">
          <CardContent className="flex p-0 items-center gap-5">
            <div className="size-12 bg-[oklch(0.9_0.08_75)] shrink-0 rounded-xl flex justify-center items-center">
              <ClipboardCheck className="size-6 text-[oklch(0.5_0.12_65)]" />
            </div>
            <div className="flex flex-col flex-1 gap-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-950 text-base leading-6">
                  Reflect on a lesson
                </h3>
                <Badge className="bg-[oklch(0.88_0.09_75)] text-[oklch(0.42_0.1_65)] border-transparent text-xs leading-4">
                  Action needed
                </Badge>
              </div>
              <p className="text-[oklch(0.45_0.05_75)] leading-snug text-sm leading-5">
                2 delivered lessons are awaiting your post-lesson evidence.
                Record outcomes based on what learners said or did.
              </p>
            </div>
            <Button className="bg-[oklch(0.55_0.13_65)] shrink-0 text-white gap-2">
              <PencilLine className="size-4" />
              Reflect now
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  </div>
</div>;
