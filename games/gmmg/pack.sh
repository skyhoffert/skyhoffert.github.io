touch all.js

echo "// main.min.js" > all.js
cat classes.js >> all.js
cat main.js >> all.js

echo "Checking minify."
command -v minify

if [ $? -eq 0 ] ; then
	minify all.js > main.min.js
else
	echo "minify not installed"
fi

#rm all.js
