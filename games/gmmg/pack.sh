touch all.js

echo "// main.min.js" > all.js
cat classes.js >> all.js
cat main.js >> all.js

minify all.js > main.min.js

#rm all.js
