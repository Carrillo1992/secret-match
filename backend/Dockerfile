# ---------- build ----------
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Resolve dependencies in their own layer so code changes don't re-download them.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline

COPY src/ src/
# Tests need Docker (Testcontainers) and run in `./mvnw verify`, not in the image build.
RUN ./mvnw -B -q package -DskipTests

# ---------- runtime ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /workspace/target/secret-match-api-*.jar app.jar
USER app
# Sized for one Heroku Basic dyno (512 MB): above it Heroku logs R14 and swaps, at 1 GB it restarts the dyno (R15).
# The sizes are explicit because Heroku warns that a dyno may report the host's memory instead of its own limit,
# which would make a percentage of RAM meaningless. Roughly: 256 MB of heap, ~130 MB of metaspace and code cache,
# plus thread stacks and native memory, leaves headroom under 512 MB.
#   -Xmx256m -Xms64m         heap ceiling; start small so idle RSS stays low
#   -Xss512k                 half the default thread stack, what Heroku's own Java runtime uses
#   -XX:+UseSerialGC         no parallel GC threads or their memory: one small dyno, a fraction of a CPU
#   -XX:ReservedCodeCacheSize=64m -XX:MaxMetaspaceSize=192m   bound the JIT and class metadata
#   -XX:TieredStopAtLevel=1  C1 only: a faster start and a smaller code cache on a slow CPU, at some peak speed
#   -XX:+ExitOnOutOfMemoryError  a broken JVM exits so Heroku restarts the dyno, instead of limping on
# JAVA_TOOL_OPTIONS is read by the JVM itself, so a Heroku config var of the same name replaces all of it.
ENV JAVA_TOOL_OPTIONS="-Xmx256m -Xms64m -Xss512k -XX:+UseSerialGC -XX:ReservedCodeCacheSize=64m -XX:MaxMetaspaceSize=192m -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError"
# Only for local runs: Heroku ignores EXPOSE and passes the port in $PORT (application.yml).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
